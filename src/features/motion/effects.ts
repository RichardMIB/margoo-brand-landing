import { clamp, smooth } from '../../lib/math'

/**
 * Efeitos de scroll do protótipo como funções puras: recebem medidas (px) e devolvem números.
 * O motor (domEffects) mede o DOM, chama estas funções e escreve os estilos.
 */

/** Margem além da tela em que um elemento ainda é animado (evita "pulo" ao entrar). */
export const VIEW_MARGIN = 150

export function inView(top: number, bottom: number, vh: number, margin = VIEW_MARGIN): boolean {
  return bottom > -margin && top < vh + margin
}

/**
 * Foto/cartão flutuante: desloca com o mouse (x, y em -0.5..0.5, já suavizados) e com o scroll.
 * Acima do centro da tela desce, abaixo sobe, na proporção da profundidade.
 * `center` é o centro do elemento SEM o deslocamento aplicado (evita realimentação).
 */
export function depthOffset(center: number, vh: number, depth: number, mouseX: number, mouseY: number) {
  return {
    x: mouseX * -18 * depth,
    y: mouseY * -14 * depth + (center - vh / 2) * -0.05 * depth,
  }
}

/** Parallax interno: quanto (% da altura da imagem) a foto desliza dentro da moldura. */
export function innerParallax(center: number, vh: number): number {
  return (clamp(center / vh, -0.2, 1.2) - 0.5) * -9
}

/** Hero: o texto desce 18% do scroll (sobe mais devagar que a página), até 900px de scroll. */
export function heroDrift(scrollY: number): number {
  return Math.min(Math.max(scrollY, 0), 900) * 0.18
}

/** Velocidade do letreiro: px de deslocamento por px de scroll (protótipo: .45). */
export const MARQUEE_SPEED = 0.45

/**
 * Letreiro: posição X da linha.
 *
 * O protótipo usava `(top - vh) * .45 * dir - 200`, que empurrava a linha até ~+300px para a
 * direita e deixava a borda esquerda vazia. Aqui o percurso é contado a partir do momento em
 * que a seção entra pela base da tela, e o resultado fica sempre em [vw - rowWidth, 0]:
 * a linha nunca descola da borda esquerda nem da direita.
 *
 * dir -1: anda para a esquerda ao descer a página. dir 1: anda para a direita.
 */
export function marqueeX(top: number, height: number, vh: number, vw: number, rowWidth: number, dir: number): number {
  const span = vh + height // de "topo na base da tela" até "base no topo da tela"
  const traveled = clamp(vh - top, 0, span) * MARQUEE_SPEED
  const x = dir < 0 ? -traveled : -span * MARQUEE_SPEED + traveled
  return clamp(x, Math.min(vw - rowWidth, 0), 0)
}

/**
 * Títulos entram de lado: deslocamento X (px). Sempre visíveis, só deslocados.
 * Máximo de 48px (protótipo), menor em telas estreitas para o texto não ser cortado na borda.
 */
export function slideX(top: number, vh: number, vw: number): number {
  const max = Math.min(48, vw * 0.04)
  return (1 - smooth(vh * 0.95, vh * 0.55, top)) * max
}

/** Linha dos passos: escala 0..1 conforme sobe na tela. */
export function lineScale(top: number, vh: number): number {
  return smooth(vh * 0.9, vh * 0.4, top)
}

/** Foto da loja: clip-path que "abre a moldura" conforme sobe na tela. */
export function revealClip(top: number, vh: number): string {
  const k = 1 - smooth(vh, vh * 0.35, top)
  const v = (n: number) => `${+(k * n).toFixed(2)}%`
  return `inset(${v(10)} ${v(14)} ${v(10)} ${v(14)} round 3px)`
}

/** Vitrine fixada: progresso 0..1 enquanto a seção de 300vh passa pela tela. */
export function railProgress(top: number, height: number, vh: number): number {
  const total = height - vh
  if (total <= 0) return 0
  return clamp(-top / total, 0, 1)
}
