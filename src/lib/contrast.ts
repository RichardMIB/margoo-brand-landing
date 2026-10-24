/** Contraste WCAG 2.x entre duas cores (funções puras, usadas no teste de acessibilidade). */

export type RGB = readonly [number, number, number]

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  const n = Number.parseInt(full, 16)
  if (full.length !== 6 || Number.isNaN(n)) throw new Error(`cor inválida: ${hex}`)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Cor semitransparente sobre um fundo opaco (o que o olho vê). */
export const blend = (fg: RGB, alpha: number, bg: RGB): RGB =>
  [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha)) as unknown as RGB

/** Luminância relativa (WCAG 2.x). */
export function luminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Razão de contraste, de 1 (igual) a 21 (preto no branco). */
export function contrastRatio(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Mínimos AA: texto normal 4.5:1; texto grande (≥ 24px, ou ≥ 18,66px em negrito) 3:1. */
export const AA = { normal: 4.5, large: 3 } as const
