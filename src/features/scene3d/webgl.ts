import { MAX_STATIC_WIDTH, type DeviceSignals } from './sceneGate'

/**
 * WebGL com GPU? Falha quando o desenho seria por software (`failIfMajorPerformanceCaveat`).
 * Medido: nesse caso cada quadro travava a página por ~500 ms (é o ambiente do PageSpeed).
 */
export function hasHardwareWebGL(): boolean {
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

/** Lê os sinais do aparelho para decideScene (sceneGate.ts). */
export function readDeviceSignals(): DeviceSignals {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  const width = window.innerWidth
  return {
    width,
    finePointer: matchMedia('(pointer: fine)').matches,
    reducedMotion,
    saveData: nav.connection?.saveData,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency || undefined,
    // Só testa o WebGL (cria um contexto) quando os outros sinais ainda permitem o 3D
    hardwareWebGL: width > MAX_STATIC_WIDTH && !reducedMotion ? hasHardwareWebGL() : false,
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
