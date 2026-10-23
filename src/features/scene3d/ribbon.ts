import { lerp } from '../../lib/math'

/** Malha da fita: segmentos ao longo do comprimento e na largura (protótipo: 240 × 20). */
export const RIBBON_SEGMENTS = 240
export const RIBBON_ACROSS = 20
/** Largura da fita em unidades do mundo. */
export const RIBBON_WIDTH = 1.6

export interface Vec3 {
  x: number
  y: number
  z: number
}

/**
 * Ponto da fita de cetim (função do protótipo, sem alterações na forma).
 *
 * @param u comprimento, 0..1 (de x = -9.5 a 9.5)
 * @param v largura, -0.5..0.5
 * @param t tempo em segundos (ondulação)
 * @param phase giro da fita conforme o scroll (p * 11)
 * @param amp amplitude: 1 parada, até 2.4 com vento forte
 * @param out vetor reaproveitado (evita criar 5 mil objetos por quadro)
 */
export function ribbonAt(u: number, v: number, t: number, phase: number, amp: number, out: Vec3): Vec3 {
  const x = lerp(-9.5, 9.5, u)
  const y =
    Math.sin(u * Math.PI * 2.4 + t * 0.55 + phase) * 1.5 * amp + Math.sin(u * Math.PI * 5 + t * 0.9) * 0.3 * amp
  const z = Math.cos(u * Math.PI * 1.8 + t * 0.4 + phase * 0.6) * 2.1
  const twist = u * Math.PI * 3.2 + Math.sin(t * 0.35 + u * 4) * 0.9 + phase
  const fold = Math.sin((v + 0.5) * Math.PI) * 0.2 * amp * Math.sin(u * 22 + t * 1.6)
  out.x = x
  out.y = y + Math.cos(twist) * v * RIBBON_WIDTH
  out.z = z + Math.sin(twist) * v * RIBBON_WIDTH + fold
  return out
}

/**
 * Preenche o buffer de posições na mesma ordem dos vértices do PlaneGeometry(1, 1, seg, across):
 * linha a linha na largura, e dentro de cada linha ao longo do comprimento.
 */
export function writeRibbonPositions(
  target: Float32Array,
  t: number,
  phase: number,
  amp: number,
  segments = RIBBON_SEGMENTS,
  across = RIBBON_ACROSS,
): void {
  const p: Vec3 = { x: 0, y: 0, z: 0 }
  let i = 0
  for (let a = 0; a <= across; a++) {
    const v = a / across - 0.5
    for (let s = 0; s <= segments; s++) {
      ribbonAt(s / segments, v, t, phase, amp, p)
      target[i++] = p.x
      target[i++] = p.y
      target[i++] = p.z
    }
  }
}
