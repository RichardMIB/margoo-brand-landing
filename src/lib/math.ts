/** Prende `v` entre `min` e `max`. */
export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))

/** Interpolação linear: t=0 → a, t=1 → b. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * Smoothstep de `edge0` a `edge1`: 0 antes, 1 depois, curva suave no meio.
 * Aceita bordas invertidas (edge0 > edge1), como o protótipo usa com posições na tela
 * (ex.: smooth(vh * .95, vh * .55, top) cresce conforme o elemento sobe).
 */
export const smooth = (edge0: number, edge1: number, v: number): number => {
  if (edge0 === edge1) return v < edge0 ? 0 : 1
  const t = clamp((v - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/**
 * Fator de suavização independente da taxa de quadros.
 * `k` é a fração que o valor anda em direção ao alvo a cada quadro de 60 Hz (ex.: 0.06).
 * Com `dt` em segundos: 1 - (1 - k)^(dt * 60). A 120 Hz cada quadro anda menos, e em 1 s
 * o resultado é o mesmo que a 60 Hz. Uso: atual = lerp(atual, alvo, damp(k, dt)).
 */
export const damp = (k: number, dt: number): number => 1 - Math.pow(1 - k, dt * 60)
