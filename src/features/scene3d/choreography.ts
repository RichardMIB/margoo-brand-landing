import { clamp, lerp, smooth } from '../../lib/math'
import type { Vec3 } from './ribbon'

/**
 * Coreografia da cena "Fio + colar" (protótipo), como funções puras:
 * recebem o progresso da página (p, 0..1), o tempo e o tamanho visível; devolvem números.
 */

export const PEARL_COUNT = 25
/** Pérolas visíveis desde o topo; as outras surgem entre p 0.15 e 0.45. */
export const PEARLS_VISIBLE_AT_TOP = 6
/** Faixa do scroll em que as pérolas viram colar e a fita desce. */
export const NECKLACE_FROM = 0.8
export const NECKLACE_TO = 0.97

export const CAMERA_FOV = 32

/** Câmera mais longe em tela vertical para a fita caber na largura. */
export const cameraDistance = (aspect: number): number => (aspect < 1 ? 21 : 14)

/** Altura visível (unidades do mundo) no plano z = 0. */
export const visibleHeight = (fov: number, distance: number): number => 2 * Math.tan(((fov / 2) * Math.PI) / 180) * distance

/** Progresso da página, 0..1. */
export const pageProgress = (scrollY: number, maxScroll: number): number =>
  maxScroll > 0 ? clamp(scrollY / maxScroll, 0, 1) : 0

export interface RibbonPose {
  /** Giro da fita ao longo do comprimento. */
  phase: number
  x: number
  y: number
  rotationZ: number
  scale: number
  /** 0..1: quanto as pérolas já viraram colar. */
  necklace: number
}

/** Pose da fita conforme o scroll: gira, passeia em x/y e, no fim, desce e encolhe. */
export function ribbonPose(p: number): RibbonPose {
  const k = smooth(NECKLACE_FROM, NECKLACE_TO, p)
  return {
    phase: p * 11,
    x: Math.sin(p * Math.PI * 2.2) * 1.6,
    y: Math.sin(p * Math.PI * 3) * 1.6 - k * 6.5,
    rotationZ: -0.08 + Math.sin(p * Math.PI * 2) * 0.38,
    scale: 1 - k * 0.35,
    necklace: k,
  }
}

/** Vento: a velocidade do scroll (px/s) agita o tecido. Devolve a amplitude-alvo (1 a 2.4). */
export const windAmplitude = (velocity: number): number => 1 + clamp(Math.abs(velocity) / 1800, 0, 1.4)

export interface Pearl {
  /** Posição espalhada (início da página). */
  scatter: Vec3
  /** Posição no colar, 0..1 ao longo do U. */
  u: number
  /** Tamanho espalhada. */
  size: number
  /** Fase da flutuação. */
  phase: number
  visibleAtTop: boolean
}

/** Gerador pseudoaleatório do protótipo (Park–Miller): mesma semente, mesmas pérolas. */
export function createRng(seed = 7) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

/** As 25 pérolas, na mesma ordem de sorteio do protótipo. */
export function createPearls(count = PEARL_COUNT, seed = 7): Pearl[] {
  const rnd = createRng(seed)
  return Array.from({ length: count }, (_, i) => {
    const scatter = { x: (rnd() - 0.5) * 15, y: (rnd() - 0.5) * 8.5, z: (rnd() - 0.5) * 4 - 1 }
    const size = 0.12 + rnd() * 0.3
    return { scatter, u: i / (count - 1), size, phase: rnd() * 6.28, visibleAtTop: i < PEARLS_VISIBLE_AT_TOP }
  })
}

/**
 * Ponto do colar em U: pende dos cantos de cima da tela e passa por baixo do título final.
 * Calculado a partir do tamanho visível, então acompanha o resize.
 */
export function necklacePoint(u: number, visW: number, visH: number, out: Vec3): Vec3 {
  const R = Math.min(6, (visW / 2) * 0.86)
  const top = (visH / 2) * 0.9
  const dip = visH * 0.62
  const x = (u - 0.5) * 2 * R
  out.x = x
  out.y = top - dip * (1 - (x / R) ** 2)
  out.z = 0.5
  return out
}

/** Tamanho de cada pérola no colar. */
export const NECKLACE_PEARL_SIZE = 0.2

export interface PearlPose extends Vec3 {
  scale: number
}

/**
 * Pose de uma pérola: espalhada e flutuando no começo, no colar no fim.
 * Depende só de p e do tempo em segundos (não da taxa de quadros).
 */
export function pearlPose(pearl: Pearl, p: number, t: number, visW: number, visH: number, out: PearlPose): PearlPose {
  const k = smooth(NECKLACE_FROM, NECKLACE_TO, p)
  const appear = pearl.visibleAtTop ? 1 : smooth(0.15, 0.45, p)
  necklacePoint(pearl.u, visW, visH, out)
  const bob = Math.sin(t * 0.8 + pearl.phase) * 0.22
  out.x = lerp(pearl.scatter.x, out.x, k) + Math.sin(p * 6 + pearl.phase) * 0.6 * (1 - k)
  out.y = lerp(pearl.scatter.y, out.y, k) + bob * (1 - k)
  out.z = lerp(pearl.scatter.z, out.z, k)
  out.scale = lerp(pearl.size, NECKLACE_PEARL_SIZE, k) * appear
  return out
}
