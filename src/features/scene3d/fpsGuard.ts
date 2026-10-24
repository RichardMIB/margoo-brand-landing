/**
 * Proteção de FPS da cena ao vivo (ADR 004): mede os quadros depois que a cena aparece e
 * decide, uma vez só, se ela fica ou dá lugar aos pôsteres. Pura: o relógio vem de fora.
 */

/** Primeiro trecho visível ignorado: compilação tardia, decodificação de fotos, GC. */
export const FPS_WARMUP_MS = 1000
/** Quanto tempo visível é medido depois do aquecimento. */
export const FPS_SAMPLE_MS = 3000
/** Média abaixo disto troca a cena pelos pôsteres. */
export const MIN_LIVE_FPS = 40

export type FpsVerdict = 'measuring' | 'ok' | 'slow'

export interface FpsGuardOptions {
  warmupMs?: number
  sampleMs?: number
  minFps?: number
}

export function createFpsGuard({
  warmupMs = FPS_WARMUP_MS,
  sampleMs = FPS_SAMPLE_MS,
  minFps = MIN_LIVE_FPS,
}: FpsGuardOptions = {}) {
  let last: number | null = null
  let warm = 0
  let measured = 0
  let frames = 0
  let verdict: FpsVerdict = 'measuring'

  return {
    /** Um quadro desenhado no instante `now` (ms). Depois de decidido, devolve sempre o mesmo veredito. */
    frame(now: number): FpsVerdict {
      if (verdict !== 'measuring') return verdict
      const delta = last === null ? 0 : now - last
      last = now
      if (delta <= 0) return verdict
      if (warm < warmupMs) {
        warm += delta
        return verdict
      }
      measured += delta
      frames++
      if (measured >= sampleMs) verdict = (frames * 1000) / measured < minFps ? 'slow' : 'ok'
      return verdict
    },

    /**
     * Aba oculta ou quadro parado (movimento reduzido): o intervalo até o próximo quadro não
     * conta. Sem isso, voltar de outra aba pareceria um quadro de vários segundos.
     */
    pause() {
      last = null
    },

    get verdict() {
      return verdict
    },

    /** Média medida (quadros por segundo); 0 enquanto não houver amostra. */
    get fps() {
      return measured > 0 ? Math.round((frames * 1000) / measured) : 0
    },
  }
}

export type FpsGuard = ReturnType<typeof createFpsGuard>
