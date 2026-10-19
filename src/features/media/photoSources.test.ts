import { describe, expect, it } from 'vitest'
import { photoSources } from './photoSources'

describe('photoSources', () => {
  it('lista as larguras reais em ordem crescente e usa a maior como src', () => {
    const s = photoSources({
      width: 1600,
      height: 2000,
      variants: [
        { file: '/img/a-960.webp', width: 960 },
        { file: '/img/a-480.webp', width: 480 },
      ],
    })
    expect(s.srcSet).toBe('/img/a-480.webp 480w, /img/a-960.webp 960w')
    expect(s.src).toBe('/img/a-960.webp')
    expect([s.width, s.height]).toEqual([1600, 2000])
  })

  it('não repete a mesma largura quando a foto original é pequena', () => {
    const s = photoSources({
      width: 480,
      height: 600,
      variants: [
        { file: '/img/b-480.webp', width: 480 },
        { file: '/img/b-960.webp', width: 480 },
      ],
    })
    expect(s.srcSet).toBe('/img/b-480.webp 480w')
  })

  it('falha alto se a foto não tiver variantes', () => {
    expect(() => photoSources({ width: 1, height: 1, variants: [] })).toThrow()
  })
})
