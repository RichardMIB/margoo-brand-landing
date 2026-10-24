import { Component, Suspense, lazy, useCallback, useEffect, useState, type ReactNode } from 'react'
import { ScenePosters } from './ScenePosters'
import { decideScene } from './sceneGate'
import { readDeviceSignals, whenPageIdle } from './webgl'

const SceneCanvas = lazy(() => import('./SceneCanvas'))

/** Cena reprovada pela proteção de FPS nesta visita (aba): não baixa o 3D de novo ao recarregar. */
const SLOW_KEY = 'margoo:cena-lenta'
/** Fade de saída da cena (0,5 s no CSS) + folga para os pôsteres decodificarem e entrarem. */
const LEAVE_MS = 900

function slowThisVisit(): boolean {
  try {
    return sessionStorage.getItem(SLOW_KEY) === '1'
  } catch {
    return false
  }
}

function rememberSlow() {
  try {
    sessionStorage.setItem(SLOW_KEY, '1')
  } catch {
    /* aba anônima ou armazenamento bloqueado: só vale para esta carga */
  }
}

/** Se o pedaço do 3D não baixar ou a cena quebrar, some com ela em vez de derrubar a página. */
class SceneErrorBoundary extends Component<{ onError(): void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('Cena 3D desligada:', error)
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * Camada da cena atrás do conteúdo (ADR 004).
 * - Desktop forte: cena 3D ao vivo, baixada só depois do conteúdo (load + fontes + LCP + ocioso).
 * - Celular, aparelho fraco, economia de dados, movimento reduzido ou sem GPU: pôsteres estáticos,
 *   sem baixar o pedaço do 3D.
 * - Se a cena quebrar ou o WebGL cair: troca pelos pôsteres.
 * - Proteção de FPS: média abaixo de 40 fps depois que a cena aparece → fade para os pôsteres e a
 *   cena é desmontada (libera GPU e sai do motor). Decide uma vez por visita.
 */
export function SceneLayer() {
  // Decidido uma vez, na montagem (lê janela e navigator; a página não tem renderização no servidor)
  const [decision] = useState(() => decideScene(readDeviceSignals()))
  const [state, setState] = useState<'waiting' | 'on' | 'leaving' | 'off'>(() =>
    slowThisVisit() ? 'off' : 'waiting',
  )

  useEffect(() => {
    if (decision.mode !== 'live') return
    return whenPageIdle(() => setState((s) => (s === 'waiting' ? 'on' : s)))
  }, [decision])

  useEffect(() => {
    if (state !== 'leaving') return
    const id = setTimeout(() => setState('off'), LEAVE_MS)
    return () => clearTimeout(id)
  }, [state])

  const off = useCallback(() => setState('off'), [])
  const slow = useCallback((fps: number) => {
    console.info(`Cena 3D trocada pelos pôsteres: ${fps} fps de média (mínimo 40).`)
    rememberSlow()
    setState((s) => (s === 'on' ? 'leaving' : s))
  }, [])

  const live = decision.mode === 'live'
  // Posições fixas no fragmento: os pôsteres que entram no 'leaving' não remontam (nem piscam) no 'off'
  const showPosters = !live || state === 'leaving' || state === 'off'
  const showScene = live && (state === 'on' || state === 'leaving')
  return (
    <>
      {showPosters && <ScenePosters />}
      {showScene && (
        <SceneErrorBoundary onError={off}>
          <Suspense fallback={null}>
            <SceneCanvas onContextLost={off} onSlow={slow} leaving={state === 'leaving'} />
          </Suspense>
        </SceneErrorBoundary>
      )}
    </>
  )
}
