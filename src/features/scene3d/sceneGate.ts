/**
 * Decide se a cena 3D ao vivo carrega ou se a página mostra os pôsteres estáticos (ADR 004).
 * Função pura: recebe os sinais do aparelho e devolve a decisão com o motivo.
 */

/** Até esta largura (px) é celular: pôster estático. Mesmo corte da vitrine em carrossel. */
export const MAX_STATIC_WIDTH = 760
/** Memória (GB, navigator.deviceMemory) igual ou abaixo disto: aparelho fraco. */
export const MAX_STATIC_MEMORY_GB = 4
/** Núcleos (navigator.hardwareConcurrency) igual ou abaixo disto: aparelho fraco. */
export const MAX_STATIC_CORES = 4

export interface DeviceSignals {
  /** Largura da janela em px. */
  width: number
  reducedMotion: boolean
  /** navigator.connection.saveData; indefinido onde a API não existe (Safari, Firefox). */
  saveData?: boolean
  /** navigator.deviceMemory em GB; indefinido onde a API não existe (Safari, Firefox). */
  deviceMemory?: number
  /** navigator.hardwareConcurrency; indefinido se o navegador não informar. */
  hardwareConcurrency?: number
  /** WebGL com GPU disponível (sem desenho por software). */
  hardwareWebGL: boolean
}

export type StaticReason =
  | 'tela-estreita'
  | 'economia-de-dados'
  | 'pouca-memoria'
  | 'poucos-nucleos'
  | 'movimento-reduzido'
  | 'sem-webgl'

export type SceneDecision = { mode: 'live' } | { mode: 'static'; reason: StaticReason }

/**
 * Regra de produto (ADR 004): o 3D ao vivo só carrega em tela larga, com aparelho forte, sem
 * economia de dados, sem movimento reduzido e com GPU. Sinal ausente (API não existe naquele
 * navegador) não conta contra o aparelho.
 */
export function decideScene(s: DeviceSignals): SceneDecision {
  if (s.width <= MAX_STATIC_WIDTH) return { mode: 'static', reason: 'tela-estreita' }
  if (s.saveData === true) return { mode: 'static', reason: 'economia-de-dados' }
  if (s.deviceMemory !== undefined && s.deviceMemory <= MAX_STATIC_MEMORY_GB)
    return { mode: 'static', reason: 'pouca-memoria' }
  if (s.hardwareConcurrency !== undefined && s.hardwareConcurrency <= MAX_STATIC_CORES)
    return { mode: 'static', reason: 'poucos-nucleos' }
  if (s.reducedMotion) return { mode: 'static', reason: 'movimento-reduzido' }
  if (!s.hardwareWebGL) return { mode: 'static', reason: 'sem-webgl' }
  return { mode: 'live' }
}
