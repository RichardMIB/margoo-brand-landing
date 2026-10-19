export type GlassStrength = 'button' | 'card'

/** Inclinação máxima (graus) por tipo: cartão largo inclina menos que botão. */
const TILT: Record<GlassStrength, { rx: number; ry: number }> = {
  button: { rx: 16, ry: 14 },
  card: { rx: 9, ry: 6 },
}

export const TILT_VARS = ['--rx', '--ry', '--tx', '--ty'] as const

/**
 * Converte a posição do cursor dentro do elemento (x, y de 0 a 1) nas variáveis CSS do vidro.
 * `tilt=false` (toque ou movimento reduzido) devolve só a luz, sem inclinação nem magnetismo.
 */
export function glassPointerVars(
  x: number,
  y: number,
  strength: GlassStrength,
  tilt: boolean,
): Record<string, string> {
  const vars: Record<string, string> = {
    '--mx': `${(x * 100).toFixed(1)}%`,
    '--my': `${(y * 100).toFixed(1)}%`,
  }
  if (!tilt) return vars
  const k = TILT[strength]
  vars['--rx'] = `${((0.5 - y) * k.rx).toFixed(2)}deg`
  vars['--ry'] = `${((x - 0.5) * k.ry).toFixed(2)}deg`
  vars['--tx'] = `${((x - 0.5) * 8).toFixed(1)}px` // leve magnetismo
  vars['--ty'] = `${((y - 0.5) * 6).toFixed(1)}px`
  return vars
}
