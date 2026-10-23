import { damp, lerp } from '../../lib/math'

/**
 * Motor único de scroll: o ÚNICO dono do requestAnimationFrame da página.
 *
 * Cada quadro ele lê o scroll, calcula a velocidade e o mouse suavizado e entrega esse estado
 * a todos os clientes registrados (efeitos do DOM agora; a cena 3D quando o lazy carregar).
 * Clientes entram e saem a qualquer momento: a página funciona sem a cena e não quebra se ela
 * nunca carregar.
 *
 * Toda suavização usa `damp` (depende do tempo real, não da taxa de quadros): a 60 Hz e a
 * 120 Hz o mouse e a velocidade chegam ao mesmo valor no mesmo tempo.
 *
 * Aba oculta: o loop para de vez e volta ao reabrir.
 *
 * Movimento reduzido: não há loop contínuo. Os clientes recebem um quadro parado (`still`)
 * só quando o scroll ou o tamanho da tela mudam, para se desenharem em repouso.
 */

export interface FrameState {
  /** Segundos desde o quadro anterior (máx. 0.05, para não "pular" após aba em segundo plano). */
  dt: number
  scrollY: number
  /** Velocidade do scroll em px/s, suavizada (alimenta o vento da cena 3D). */
  velocity: number
  /** Mouse suavizado, -0.5..0.5 a partir do centro da tela. Fica em 0 sem ponteiro fino. */
  mouseX: number
  mouseY: number
  vw: number
  vh: number
  /** Quanto a página rola no total (altura do documento - altura da tela). */
  maxScroll: number
  /** true = movimento reduzido: desenhe em repouso, sem animar. */
  still: boolean
}

export interface FrameClient {
  frame(state: FrameState): void
  /** Chamado ao sair do motor: devolva o DOM/recursos ao estado original. */
  dispose?(): void
}

export interface EngineEnv {
  requestFrame(cb: (now: number) => void): number
  cancelFrame(id: number): void
  now(): number
  scrollY(): number
  viewport(): { vw: number; vh: number; maxScroll: number }
  /** Liga os ouvintes externos (scroll, resize, mouse, mudança de preferência). Devolve a limpeza. */
  listen(handlers: EnvHandlers): () => void
  prefersReducedMotion(): boolean
  hidden(): boolean
}

export interface EnvHandlers {
  onPointer(x: number, y: number): void
  onScrollOrResize(): void
  onReducedMotionChange(): void
  onVisibilityChange(): void
}

const MAX_DT = 0.05
/** Frações por quadro de 60 Hz (valores do protótipo), convertidas pelo damp. */
const VELOCITY_SMOOTHING = 0.15
const MOUSE_SMOOTHING = 0.06

export function createScrollEngine(getEnv: () => EngineEnv = browserEnv) {
  const clients = new Set<FrameClient>()
  let env: EngineEnv | null = null
  let unlisten: (() => void) | null = null
  let rafId: number | null = null
  let pendingStill = false
  let last = 0
  let lastY = 0
  const target = { x: 0, y: 0 }
  const state: FrameState = { dt: 0, scrollY: 0, velocity: 0, mouseX: 0, mouseY: 0, vw: 0, vh: 0, maxScroll: 0, still: false }

  const emit = () => {
    for (const c of clients) c.frame(state)
  }

  const loop = (now: number) => {
    if (!env) return
    const dt = Math.min(Math.max((now - last) / 1000, 0), MAX_DT)
    last = now
    const y = env.scrollY()
    const v = (y - lastY) / Math.max(dt, 0.001)
    lastY = y
    Object.assign(state, env.viewport())
    state.dt = dt
    state.scrollY = y
    state.velocity = lerp(state.velocity, v, damp(VELOCITY_SMOOTHING, dt))
    const m = damp(MOUSE_SMOOTHING, dt)
    state.mouseX = lerp(state.mouseX, target.x, m)
    state.mouseY = lerp(state.mouseY, target.y, m)
    state.still = false
    emit()
    rafId = env.requestFrame(loop)
  }

  const drawStill = () => {
    pendingStill = false
    rafId = null
    if (!env) return
    Object.assign(state, env.viewport(), { dt: 0, scrollY: env.scrollY(), velocity: 0, mouseX: 0, mouseY: 0, still: true })
    emit()
  }

  /** Movimento reduzido: no máximo um quadro parado por frame, só quando algo muda. */
  const requestStill = () => {
    if (!env || pendingStill) return
    pendingStill = true
    rafId = env.requestFrame(drawStill)
  }

  const run = () => {
    if (!env) return
    if (rafId !== null) env.cancelFrame(rafId)
    rafId = null
    pendingStill = false
    if (env.hidden()) return // volta pelo onVisibilityChange
    if (env.prefersReducedMotion()) {
      requestStill()
    } else {
      last = env.now()
      lastY = env.scrollY()
      state.velocity = 0
      rafId = env.requestFrame(loop)
    }
  }

  return {
    /** Idempotente: chamar duas vezes (StrictMode) não cria dois loops. */
    start() {
      if (env) return
      env = getEnv()
      unlisten = env.listen({
        onPointer(x, y) {
          target.x = x
          target.y = y
        },
        onScrollOrResize() {
          if (env?.prefersReducedMotion()) requestStill()
        },
        onReducedMotionChange: run,
        onVisibilityChange: run,
      })
      run()
    },

    stop() {
      if (!env) return
      if (rafId !== null) env.cancelFrame(rafId)
      unlisten?.()
      env = null
      unlisten = null
      rafId = null
      pendingStill = false
    },

    /** Registra um cliente; funciona antes ou depois do start. Devolve a função que o remove. */
    add(client: FrameClient) {
      clients.add(client)
      if (env?.prefersReducedMotion()) requestStill() // desenha em repouso logo ao entrar
      return () => {
        if (clients.delete(client)) client.dispose?.()
      }
    },

    get running() {
      return env !== null
    },
  }
}

export type ScrollEngine = ReturnType<typeof createScrollEngine>

function browserEnv(): EngineEnv {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)')
  const finePointer = matchMedia('(pointer: fine)')
  return {
    requestFrame: (cb) => requestAnimationFrame(cb),
    cancelFrame: (id) => cancelAnimationFrame(id),
    now: () => performance.now(),
    scrollY: () => window.scrollY,
    viewport: () => ({
      vw: window.innerWidth,
      vh: window.innerHeight,
      maxScroll: Math.max(document.documentElement.scrollHeight - window.innerHeight, 0),
    }),
    prefersReducedMotion: () => reduce.matches,
    hidden: () => document.hidden,
    listen({ onPointer, onScrollOrResize, onReducedMotionChange, onVisibilityChange }) {
      const pointer = (e: PointerEvent) => {
        if (finePointer.matches) onPointer(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5)
      }
      const opts = { passive: true } as const
      window.addEventListener('pointermove', pointer, opts)
      window.addEventListener('scroll', onScrollOrResize, opts)
      window.addEventListener('resize', onScrollOrResize, opts)
      reduce.addEventListener('change', onReducedMotionChange)
      document.addEventListener('visibilitychange', onVisibilityChange)
      return () => {
        document.removeEventListener('visibilitychange', onVisibilityChange)
        window.removeEventListener('pointermove', pointer)
        window.removeEventListener('scroll', onScrollOrResize)
        window.removeEventListener('resize', onScrollOrResize)
        reduce.removeEventListener('change', onReducedMotionChange)
      }
    },
  }
}

/** Instância da página. Não toca no `window` até o start(). */
export const scrollEngine = createScrollEngine()
