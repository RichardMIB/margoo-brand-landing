/**
 * Vale a pena carregar a cena 3D? A página fica sem ela (e continua completa: a cena é
 * decorativa) quando:
 * - não há WebGL;
 * - o WebGL seria desenhado por software, sem GPU (`failIfMajorPerformanceCaveat`). Medido:
 *   cada quadro travava a página por ~500 ms nesse caso (é o ambiente do Lighthouse/PageSpeed);
 * - a "economia de dados" está ligada (o pedaço do 3D tem ~245 kB gzip).
 */
export function canRenderScene(): boolean {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } }
  if (nav.connection?.saveData) return false
  try {
    const canvas = document.createElement('canvas')
    const opts: WebGLContextAttributes = { failIfMajorPerformanceCaveat: true }
    const gl = canvas.getContext('webgl2', opts) ?? canvas.getContext('webgl', opts)
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext() // libera o contexto de teste na hora
    return true
  } catch {
    return false
  }
}

/** Depois do evento load e de um momento ocioso: a cena nunca disputa com o conteúdo (LCP). */
export function whenPageIdle(cb: () => void): () => void {
  let cancelled = false
  let idleId: number | undefined
  let timerId: ReturnType<typeof setTimeout> | undefined
  const schedule = () => {
    if (cancelled) return
    if ('requestIdleCallback' in window) idleId = window.requestIdleCallback(cb, { timeout: 2500 })
    else timerId = setTimeout(cb, 300)
  }
  if (document.readyState === 'complete') schedule()
  else window.addEventListener('load', schedule, { once: true })
  return () => {
    cancelled = true
    window.removeEventListener('load', schedule)
    if (idleId !== undefined) window.cancelIdleCallback(idleId)
    if (timerId !== undefined) clearTimeout(timerId)
  }
}
