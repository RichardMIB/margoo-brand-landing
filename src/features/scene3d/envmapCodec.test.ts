import { describe, expect, it } from 'vitest'
import {
  decodeEnvmap,
  encodeEnvmap,
  encodeRGBEPixel,
  floatToHalf,
  halfToFloat,
  paethFilter,
  subFilter,
  unPaethFilter,
  unSubFilter,
} from './envmapCodec'

describe('half float', () => {
  it.each([0, 1, -2, 0.5, 0.1, 3.14159, 65504, 6.1e-5, 1e-7])('ida e volta de %d com erro de half', (v) => {
    const back = halfToFloat(floatToHalf(v))
    expect(Math.abs(back - v)).toBeLessThanOrEqual(Math.max(Math.abs(v) * 2 ** -11, 2 ** -24))
  })
  it('valores conhecidos', () => {
    expect(floatToHalf(1)).toBe(0x3c00)
    expect(floatToHalf(-2)).toBe(0xc000)
    expect(halfToFloat(0x7bff)).toBe(65504)
    expect(halfToFloat(0x7c00)).toBe(Infinity)
  })
})

describe('RGBE', () => {
  const roundtrip = (r: number, g: number, b: number) => {
    const half = new Uint16Array([floatToHalf(r), floatToHalf(g), floatToHalf(b), 0x3c00])
    const back = decodeEnvmap(encodeEnvmap(half, 1), 1)
    return [halfToFloat(back[0]), halfToFloat(back[1]), halfToFloat(back[2]), halfToFloat(back[3])]
  }

  it('preserva brilhos HDR (acima de 1) com ~1% de erro no canal mais forte', () => {
    for (const [r, g, b] of [
      [12.5, 8, 3],
      [0.8, 0.6, 0.4],
      [40, 40, 40],
      [0.02, 0.01, 0.015],
    ]) {
      const [R, G, B, A] = roundtrip(r, g, b)
      const max = Math.max(r, g, b)
      expect(Math.abs(R - r)).toBeLessThan(max * 0.01)
      expect(Math.abs(G - g)).toBeLessThan(max * 0.01)
      expect(Math.abs(B - b)).toBeLessThan(max * 0.01)
      expect(A).toBe(1)
    }
  })

  it('potência exata de 2 não estoura os 8 bits', () => {
    const out = new Uint8Array(4)
    encodeRGBEPixel(4, 1, 0, out, 0)
    expect(out[0]).toBeLessThanOrEqual(255)
    const [R] = roundtrip(4, 1, 0)
    expect(R).toBeCloseTo(4, 1)
  })

  it('preto e negativos viram zero', () => {
    expect(roundtrip(0, 0, 0).slice(0, 3)).toEqual([0, 0, 0])
    expect(roundtrip(-1, 0, 0).slice(0, 3)).toEqual([0, 0, 0])
  })
})

describe('filtro Paeth', () => {
  it('ida e volta exata numa imagem de várias linhas', () => {
    const width = 5
    const original = Uint8Array.from({ length: width * 4 * 4 }, (_, i) => (i * 131 + 7) & 0xff)
    expect(unPaethFilter(paethFilter(original, width), width)).toEqual(original)
  })
  it('degradê vertical vira zeros fora da primeira linha e coluna', () => {
    const width = 4
    const bytes = Uint8Array.from({ length: width * 4 * 3 }, (_, i) => 50 + Math.floor(i / (width * 4)) * 3)
    const filtered = paethFilter(bytes, width)
    expect([...filtered.slice(width * 4)].filter((v) => v !== 0 && v !== 3).length).toBe(0)
  })
})

describe('filtro Sub', () => {
  it('ida e volta exata, inclusive com estouro de byte', () => {
    const width = 3
    const original = Uint8Array.from({ length: width * 4 * 2 }, (_, i) => (i * 97 + 13) & 0xff)
    const copy = original.slice()
    expect(unSubFilter(subFilter(copy, width), width)).toEqual(original)
  })
  it('gradiente suave vira quase só diferenças pequenas (é o que o gzip aproveita)', () => {
    const width = 8
    const bytes = Uint8Array.from({ length: width * 4 }, (_, i) => 100 + Math.floor(i / 4))
    const filtered = subFilter(bytes.slice(), width)
    expect([...filtered.slice(4)].every((v) => v === 1)).toBe(true)
  })
})
