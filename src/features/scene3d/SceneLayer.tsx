import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { canRenderScene, whenPageIdle } from './webgl'

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
 * Camada da cena 3D (atrás do conteúdo). Só carrega depois da página pronta e ociosa,
 * só se houver WebGL, e desliga sozinha se o contexto WebGL for perdido.
 */
export function SceneLayer() {
  const [state, setState] = useState<'waiting' | 'on' | 'off'>('waiting')

  useEffect(() => {
    if (!canRenderScene()) return
    return whenPageIdle(() => setState((s) => (s === 'waiting' ? 'on' : s)))
  }, [])

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
