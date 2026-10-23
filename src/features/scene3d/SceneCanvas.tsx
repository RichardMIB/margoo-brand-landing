import { Canvas } from '@react-three/fiber'
import { useCallback, useState } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { CAMERA_FOV } from './choreography'
import { RibbonScene } from './RibbonScene'

interface SceneCanvasProps {
  /** O navegador derrubou o WebGL (GPU reiniciou, muitas abas): a página segue sem a cena. */
  onContextLost(): void
}

/**
 * Canvas fixo atrás da página inteira. Carregado com React.lazy (three + R3F num pedaço
 * separado do JS principal). `frameloop="never"`: quem manda desenhar é o scrollEngine.
 */
export default function SceneCanvas({ onContextLost }: SceneCanvasProps) {
  const [ready, setReady] = useState(false)
  const markReady = useCallback(() => setReady(true), [])
  return (
    <Canvas
      aria-hidden="true"
      // Invisível até os shaders compilarem; depois entra com fade (sem fade com movimento reduzido)
      className={`scene-layer${ready ? ' is-ready' : ''}`}
      // style (não className): o R3F põe position/size inline no contêiner, e o style do usuário vem por último
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      frameloop="never"
      dpr={[1, 1.75]}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 100, position: [0, 0, 14] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 1.1
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
