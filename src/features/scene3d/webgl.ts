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

/** Folga máxima esperando o navegador ficar ocioso antes de iniciar a cena mesmo assim. */
const IDLE_TIMEOUT_MS = 3000
/** Sem requestIdleCallback (Safari): espera fixa depois da página pronta. */
const SAFARI_DELAY_MS = 1200

/** Primeira pintura do maior elemento (LCP). Sem a API (Safari), resolve na hora. */
function firstLargestPaint(): Promise<void> {
  if (!PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint')) return Promise.resolve()
  return new Promise((resolve) => {
    const po = new PerformanceObserver((list) => {
      if (list.getEntries().length === 0) return
      po.disconnect()
      resolve()
    })
    po.observe({ type: 'largest-contentful-paint', buffered: true })
  })
}

const pageLoaded = () =>
  document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true }))

/**
 * Chama `cb` quando a cena não disputa mais com o conteúdo: depois do load, das fontes e do
 * primeiro LCP, e então num momento ocioso. Medido: começando logo após o load, o download e a
 * execução do 3D caíam antes do LCP e o Lighthouse somava isso ao LCP (docs/performance.md).
 */
export function whenPageIdle(cb: () => void): () => void {
  let cancelled = false
  let idleId: number | undefined
  let timerId: ReturnType<typeof setTimeout> | undefined
  const run = () => {
    if (!cancelled) cb()
  }
  void Promise.all([pageLoaded(), document.fonts?.ready, firstLargestPaint()]).then(() => {
    if (cancelled) return
    if ('requestIdleCallback' in window) idleId = window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS })
    else timerId = setTimeout(run, SAFARI_DELAY_MS)
  })
  return () => {
    cancelled = true
    if (idleId !== undefined) window.cancelIdleCallback(idleId)
    if (timerId !== undefined) clearTimeout(timerId)
  }
}
