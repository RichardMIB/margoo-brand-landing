import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useState } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { scrollEngine } from '../motion/scrollEngine'
import { CAMERA_FOV } from './choreography'
import { createFpsGuard } from './fpsGuard'
import { RibbonScene } from './RibbonScene'
import { TONE_MAPPING_EXPOSURE } from './sceneRig'

interface SceneCanvasProps {
  /** O navegador derrubou o WebGL (GPU reiniciou, muitas abas): a página segue sem a cena. */
  onContextLost(): void
  /** A proteção de FPS reprovou a cena (média abaixo do mínimo). */
  onSlow(fps: number): void
  /** Saindo para os pôsteres: some com fade antes de ser desmontada. */
  leaving?: boolean
}

/**
 * Canvas fixo atrás da página inteira. Carregado com React.lazy (three + R3F num pedaço
 * separado do JS principal). `frameloop="never"`: quem manda desenhar é o scrollEngine.
 */
export default function SceneCanvas({ onContextLost, onSlow, leaving = false }: SceneCanvasProps) {
  const [ready, setReady] = useState(false)
  const markReady = useCallback(() => setReady(true), [])

  // Proteção de FPS (ADR 004): mede só depois que a cena aparece, com a aba visível
  useEffect(() => {
    if (!ready) return
    const guard = createFpsGuard()
    const onVisibility = () => {
      if (document.hidden) guard.pause()
    }
    document.addEventListener('visibilitychange', onVisibility)
    let remove: (() => void) | null = null
    const stop = () => {
      document.removeEventListener('visibilitychange', onVisibility)
      remove?.()
      remove = null
    }
    remove = scrollEngine.add({
      frame(s) {
        if (s.still) return guard.pause()
        const verdict = guard.frame(performance.now())
        if (verdict === 'measuring') return
        stop()
        if (verdict === 'slow') onSlow(guard.fps)
      },
    })
    return stop
  }, [ready, onSlow])

  return (
    <Canvas
      aria-hidden="true"
      // Invisível até os shaders compilarem; depois entra com fade (sem fade com movimento reduzido)
      className={`scene-layer${ready && !leaving ? ' is-ready' : ''}`}
      // style (não className): o R3F põe position/size inline no contêiner, e o style do usuário vem por último
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      frameloop="never"
      dpr={[1, 1.75]}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 100, position: [0, 0, 14] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = TONE_MAPPING_EXPOSURE
        gl.domElement.addEventListener(
          'webglcontextlost',
          (e) => {
            e.preventDefault()
            onContextLost()
          },
          { once: true },
        )
      }}
    >
      <RibbonScene onReady={markReady} />
    </Canvas>
  )
}
