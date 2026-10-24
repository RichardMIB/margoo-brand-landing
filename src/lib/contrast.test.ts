import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AA, blend, contrastRatio, hexToRgb } from './contrast'

describe('contrastRatio', () => {
  it('valores de referência da WCAG', () => {
    expect(contrastRatio(hexToRgb('#000'), hexToRgb('#fff'))).toBeCloseTo(21, 5)
    expect(contrastRatio(hexToRgb('#777'), hexToRgb('#777'))).toBe(1)
    expect(contrastRatio(hexToRgb('#767676'), hexToRgb('#fff'))).toBeCloseTo(4.54, 2)
  })
})

/** Tokens lidos do próprio CSS: se alguém mudar uma cor, o teste mede a cor nova. */
const css = readFileSync('src/styles/index.css', 'utf8')
const token = (name: string) => {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,6})`))
  if (!m) throw new Error(`token --color-${name} não encontrado`)
  return hexToRgb(m[1])
}
const ground = token('ground')
const groundDeep = token('ground-deep')
const ink = token('ink')
const inkSoft = token('ink-soft')
const pearl = token('pearl')
const accent = token('accent')
/** Pior caso do botão de vidro escuro: a parada mais clara do gradiente (90% opaca) sobre o fundo. */
const darkGlass = blend([64, 58, 60], 0.9, ground)

describe('contraste AA das combinações de texto da página', () => {
  it.each([
    ['texto principal (ink) no fundo', ink, ground, AA.normal],
    ['texto secundário (ink-soft) no fundo', inkSoft, ground, AA.normal],
    ['texto secundário (ink-soft) no fundo escuro', inkSoft, groundDeep, AA.normal],
    ['legenda das fotos (ink) na pílula pérola', ink, pearl, AA.normal],
    ['link "pular para o conteúdo" (ink) no pérola', ink, pearl, AA.normal],
    ['texto do botão de vidro escuro (pérola)', pearl, darkGlass, AA.normal],
    ['números dos passos (accent, 52px = texto grande)', accent, ground, AA.large],
  ])('%s', (_, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min)
  })
})
