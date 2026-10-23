import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { ScenePosters } from './ScenePosters'
import { decideScene } from './sceneGate'
import { readDeviceSignals, whenPageIdle } from './webgl'

const SceneCanvas = lazy(() => import('./SceneCanvas'))

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
 */
export function SceneLayer() {
  // Decidido uma vez, na montagem (lê janela e navigator; a página não tem renderização no servidor)
  const [decision] = useState(() => decideScene(readDeviceSignals()))
  const [state, setState] = useState<'waiting' | 'on' | 'off'>('waiting')

  useEffect(() => {
    if (decision.mode !== 'live') return
    return whenPageIdle(() => setState((s) => (s === 'waiting' ? 'on' : s)))
  }, [decision])

  if (decision.mode === 'static' || state === 'off') return <ScenePosters />
  if (state !== 'on') return null
  const off = () => setState('off')
  return (
    <SceneErrorBoundary onError={off}>
      <Suspense fallback={null}>
        <SceneCanvas onContextLost={off} />
      </Suspense>
    </SceneErrorBoundary>
  )
}
