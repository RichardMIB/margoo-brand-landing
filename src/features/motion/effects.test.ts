import { describe, expect, it } from 'vitest'
import {
  MARQUEE_SPEED,
  depthOffset,
  heroDrift,
  inView,
  innerParallax,
  lineScale,
  marqueeX,
  railProgress,
  revealClip,
  slideX,
} from './effects'

const vh = 900
const vw = 1440

describe('inView', () => {
  it('considera a margem de 150px fora da tela', () => {
    expect(inView(vh + 149, vh + 400, vh)).toBe(true)
    expect(inView(vh + 151, vh + 400, vh)).toBe(false)
    expect(inView(-500, -151, vh)).toBe(false)
  })
})

describe('depthOffset', () => {
  it('no centro da tela e com o mouse parado não desloca', () => {
    const o = depthOffset(vh / 2, vh, 1, 0, 0)
    expect(o.x).toBeCloseTo(0)
    expect(o.y).toBeCloseTo(0)
  })
  it('abaixo do centro sobe, acima desce, proporcional à profundidade', () => {
    expect(depthOffset(vh, vh, 1, 0, 0).y).toBeCloseTo(-22.5)
    expect(depthOffset(0, vh, 1, 0, 0).y).toBeCloseTo(22.5)
    expect(depthOffset(vh, vh, 0.5, 0, 0).y).toBeCloseTo(-11.25)
  })
  it('foge do mouse', () => {
    const o = depthOffset(vh / 2, vh, 1, 0.5, 0.5)
    expect(o.x).toBeCloseTo(-9)
    expect(o.y).toBeCloseTo(-7)
  })
})

describe('innerParallax', () => {
  it('fica entre -6.3% e 6.3%, dentro da sobra de 8% da imagem', () => {
    expect(innerParallax(-10_000, vh)).toBeCloseTo(6.3)
    expect(innerParallax(10_000, vh)).toBeCloseTo(-6.3)
    expect(innerParallax(vh / 2, vh)).toBeCloseTo(0)
  })
})

describe('heroDrift', () => {
  it('limita em 900px de scroll e ignora scroll negativo (iOS)', () => {
    expect(heroDrift(100)).toBeCloseTo(18)
    expect(heroDrift(5000)).toBeCloseTo(162)
    expect(heroDrift(-80)).toBe(0)
  })
})

describe('marqueeX', () => {
  const h = 260
  const rowWidth = 6000
  const tops = Array.from({ length: 61 }, (_, i) => vh + 400 - i * 50) // de abaixo da tela até bem acima

  it.each([-1, 1])('dir %i: nunca deixa borda vazia em nenhuma posição do scroll', (dir) => {
    for (const top of tops) {
      const x = marqueeX(top, h, vh, vw, rowWidth, dir)
      expect(x).toBeLessThanOrEqual(0) // borda esquerda coberta
      expect(x + rowWidth).toBeGreaterThanOrEqual(vw) // borda direita coberta
    }
  })

  it('anda na velocidade do protótipo e em sentidos opostos', () => {
    const a = marqueeX(vh - 100, h, vh, vw, rowWidth, -1)
    const b = marqueeX(vh - 200, h, vh, vw, rowWidth, -1)
    expect(a - b).toBeCloseTo(100 * MARQUEE_SPEED)
    const c = marqueeX(vh - 100, h, vh, vw, rowWidth, 1)
    const d = marqueeX(vh - 200, h, vh, vw, rowWidth, 1)
    expect(d - c).toBeCloseTo(100 * MARQUEE_SPEED)
  })

  it('linha mais curta que a tela fica parada em 0 em vez de abrir buraco', () => {
    expect(marqueeX(0, h, vh, vw, 800, -1)).toBe(0)
  })
})

describe('slideX', () => {
  it('entra 48px deslocado e chega a 0', () => {
    expect(slideX(vh, vh, vw)).toBeCloseTo(48)
    expect(slideX(vh * 0.5, vh, vw)).toBeCloseTo(0)
  })
  it('em tela estreita desloca menos para não cortar o texto', () => {
    expect(slideX(vh, vh, 360)).toBeCloseTo(14.4)
  })
})

describe('lineScale e revealClip', () => {
  it('linha começa vazia e termina cheia', () => {
    expect(lineScale(vh, vh)).toBe(0)
    expect(lineScale(vh * 0.4, vh)).toBe(1)
  })
  it('moldura começa recortada e termina aberta', () => {
    expect(revealClip(vh, vh)).toBe('inset(10% 14% 10% 14% round 3px)')
    expect(revealClip(0, vh)).toBe('inset(0% 0% 0% 0% round 3px)')
  })
})

describe('railProgress', () => {
  it('vai de 0 a 1 enquanto a seção passa e não divide por zero', () => {
    expect(railProgress(0, 3 * vh, vh)).toBe(0)
    expect(railProgress(-vh, 3 * vh, vh)).toBeCloseTo(0.5)
    expect(railProgress(-5000, 3 * vh, vh)).toBe(1)
    expect(railProgress(-100, vh, vh)).toBe(0)
  })
})
