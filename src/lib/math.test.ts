import { describe, expect, it } from 'vitest'
import { clamp, lerp, smooth } from './math'

describe('clamp', () => {
  it('mantém valores dentro do intervalo', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })
  it('prende nas bordas', () => {
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(42, 0, 10)).toBe(10)
  })
})

describe('lerp', () => {
  it('vai de a até b', () => {
    expect(lerp(2, 10, 0)).toBe(2)
    expect(lerp(2, 10, 1)).toBe(10)
    expect(lerp(2, 10, 0.5)).toBe(6)
  })
})

describe('smooth', () => {
  it('é 0 antes da borda inicial e 1 depois da final', () => {
    expect(smooth(0.8, 0.97, 0.5)).toBe(0)
    expect(smooth(0.8, 0.97, 1)).toBe(1)
  })
  it('passa por 0.5 no meio', () => {
    expect(smooth(0, 1, 0.5)).toBeCloseTo(0.5)
  })
  it('funciona com bordas invertidas (posição na tela diminuindo)', () => {
    const vh = 1000
    expect(smooth(vh * 0.95, vh * 0.55, 1200)).toBe(0) // abaixo da dobra
    expect(smooth(vh * 0.95, vh * 0.55, 100)).toBe(1) // já subiu
    expect(smooth(vh * 0.95, vh * 0.55, 750)).toBeCloseTo(0.5)
  })
  it('não divide por zero com bordas iguais', () => {
    expect(smooth(1, 1, 0)).toBe(0)
    expect(smooth(1, 1, 2)).toBe(1)
  })
})
