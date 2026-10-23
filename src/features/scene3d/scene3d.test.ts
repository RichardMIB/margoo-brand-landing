import { describe, expect, it } from 'vitest'
import {
  NECKLACE_PEARL_SIZE,
  PEARL_COUNT,
  cameraDistance,
  createPearls,
  necklacePoint,
  pageProgress,
  pearlPose,
  ribbonPose,
  visibleHeight,
  windAmplitude,
  type PearlPose,
} from './choreography'
import { RIBBON_ACROSS, RIBBON_SEGMENTS, RIBBON_WIDTH, ribbonAt, writeRibbonPositions } from './ribbon'

const v3 = () => ({ x: 0, y: 0, z: 0 })
const pose = (): PearlPose => ({ x: 0, y: 0, z: 0, scale: 0 })

describe('ribbonAt', () => {
  it('vai de x = -9.5 a 9.5 ao longo do comprimento', () => {
    expect(ribbonAt(0, 0, 0, 0, 1, v3()).x).toBe(-9.5)
    expect(ribbonAt(1, 0, 0, 0, 1, v3()).x).toBe(9.5)
  })

  it('as bordas ficam a exatamente uma largura de fita uma da outra (torção não estica)', () => {
    for (const u of [0, 0.13, 0.5, 0.77, 1]) {
      // amp 0 e borda (v = ±0.5) zera a dobra fina: sobra só a torção
      const a = ribbonAt(u, -0.5, 1.7, 2, 0, v3())
      const b = ribbonAt(u, 0.5, 1.7, 2, 0, v3())
      expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeCloseTo(RIBBON_WIDTH, 10)
    }
  })

  it('o vento (amp) aumenta a ondulação vertical', () => {
    const calm = ribbonAt(0.3, 0, 2, 0, 1, v3()).y
    const windy = ribbonAt(0.3, 0, 2, 0, 2, v3()).y
    expect(Math.abs(windy)).toBeGreaterThan(Math.abs(calm))
  })

  it('reaproveita o vetor de saída', () => {
    const out = v3()
    expect(ribbonAt(0.5, 0, 0, 0, 1, out)).toBe(out)
  })
})

describe('writeRibbonPositions', () => {
  it('preenche os 241 × 21 vértices na ordem do PlaneGeometry', () => {
    const n = (RIBBON_SEGMENTS + 1) * (RIBBON_ACROSS + 1)
    const buf = new Float32Array(n * 3)
    writeRibbonPositions(buf, 1, 0.5, 1.2)
    expect(buf.every(Number.isFinite)).toBe(true)
    // vértice 0: u = 0, v = -0.5; último: u = 1, v = 0.5
    const first = ribbonAt(0, -0.5, 1, 0.5, 1.2, v3())
    const last = ribbonAt(1, 0.5, 1, 0.5, 1.2, v3())
    expect([buf[0], buf[1], buf[2]]).toEqual([first.x, first.y, first.z].map(Math.fround))
    expect([...buf.slice(-3)]).toEqual([last.x, last.y, last.z].map(Math.fround))
  })
})

describe('ribbonPose', () => {
  it('no topo, pose inicial do protótipo', () => {
    const r = ribbonPose(0)
    expect(r).toMatchObject({ phase: 0, x: 0, y: 0, rotationZ: -0.08, scale: 1, necklace: 0 })
  })
  it('a partir de 0.8 desce e encolhe; em 0.97 o colar está completo', () => {
    expect(ribbonPose(0.8).necklace).toBe(0)
    expect(ribbonPose(0.97).necklace).toBe(1)
    expect(ribbonPose(1).scale).toBeCloseTo(0.65)
    expect(ribbonPose(1).y).toBeLessThan(ribbonPose(0.79).y - 5)
  })
})

describe('windAmplitude', () => {
  it('1 parado, cresce com a velocidade nos dois sentidos, máximo 2.4', () => {
    expect(windAmplitude(0)).toBe(1)
    expect(windAmplitude(900)).toBeCloseTo(1.5)
    expect(windAmplitude(-900)).toBeCloseTo(1.5)
    expect(windAmplitude(100_000)).toBeCloseTo(2.4)
  })
})

describe('pageProgress e câmera', () => {
  it('progresso entre 0 e 1 e sem dividir por zero', () => {
    expect(pageProgress(500, 1000)).toBe(0.5)
    expect(pageProgress(-50, 1000)).toBe(0)
    expect(pageProgress(2000, 1000)).toBe(1)
    expect(pageProgress(0, 0)).toBe(0)
  })
  it('câmera mais longe em tela vertical', () => {
    expect(cameraDistance(0.5)).toBe(21)
    expect(cameraDistance(16 / 9)).toBe(14)
  })
  it('altura visível com fov 32 a 14 unidades', () => {
    expect(visibleHeight(32, 14)).toBeCloseTo(8.029, 3)
  })
})

describe('pérolas', () => {
  const pearls = createPearls()

  it('são 25, 6 visíveis no topo, e o sorteio é sempre o mesmo', () => {
    expect(pearls).toHaveLength(PEARL_COUNT)
    expect(pearls.filter((p) => p.visibleAtTop)).toHaveLength(6)
    expect(createPearls()).toEqual(pearls)
  })

  it('as escondidas aparecem entre p 0.15 e 0.45', () => {
    const hidden = pearls[10]
    expect(pearlPose(hidden, 0.1, 0, 20, 8, pose()).scale).toBe(0)
    expect(pearlPose(hidden, 0.5, 0, 20, 8, pose()).scale).toBeCloseTo(hidden.size)
  })

  it('no fim (p ≥ 0.97) estão exatamente no colar, todas do mesmo tamanho', () => {
    for (const pearl of pearls) {
      const a = pearlPose(pearl, 1, 3.3, 20, 8, pose())
      const b = necklacePoint(pearl.u, 20, 8, v3())
      expect(a.x).toBeCloseTo(b.x)
      expect(a.y).toBeCloseTo(b.y) // sem flutuação no colar
      expect(a.scale).toBeCloseTo(NECKLACE_PEARL_SIZE)
    }
  })

  it('o tempo só mexe nas espalhadas, não no colar', () => {
    const p = pearls[3]
    expect(pearlPose(p, 0.3, 0, 20, 8, pose()).y).not.toBeCloseTo(pearlPose(p, 0.3, 2, 20, 8, pose()).y)
    expect(pearlPose(p, 1, 0, 20, 8, pose()).y).toBeCloseTo(pearlPose(p, 1, 2, 20, 8, pose()).y)
  })
})

describe('necklacePoint', () => {
  it('U simétrico: pontas no alto (90% da metade de cima), meio afundado', () => {
    const visW = 20
    const visH = 8
    const left = necklacePoint(0, visW, visH, v3())
    const right = necklacePoint(1, visW, visH, v3())
    const mid = necklacePoint(0.5, visW, visH, v3())
    expect(left.x).toBeCloseTo(-right.x)
    expect(left.y).toBeCloseTo(3.6)
    expect(mid.y).toBeCloseTo(3.6 - 8 * 0.62)
  })

  it('cabe na largura visível em tela de celular (resize)', () => {
    const visW = 4.5 // retrato estreito
    for (const u of [0, 1]) expect(Math.abs(necklacePoint(u, visW, 12, v3()).x)).toBeLessThan(visW / 2)
  })

  it('em tela larga o raio para em 6 unidades', () => {
    expect(necklacePoint(1, 40, 8, v3()).x).toBe(6)
  })
})
