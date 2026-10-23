import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group, InstancedMesh, PerspectiveCamera, Texture } from 'three'
import { damp, lerp } from '../../lib/math'
import { scrollEngine, type FrameClient, type FrameState } from '../motion/scrollEngine'
import { PEARL_COUNT, pageProgress, windAmplitude } from './choreography'
import { loadEnvironment } from './environment'
import { LIGHTS, createPoser, createSceneAssets } from './sceneRig'

/** Frações por quadro de 60 Hz (protótipo), convertidas pelo damp. */
const WIND_SMOOTHING = 0.08
const TILT_SMOOTHING = 0.05

interface RibbonSceneProps {
  /** Shaders compilados e primeiro quadro pedido: a camada pode aparecer. */
  onReady(): void
}

/**
 * Fita de cetim caramelo + 25 pérolas. Não tem loop próprio: registra-se no scrollEngine,
 * atualiza a cena a cada quadro do motor e pede um único desenho ao R3F com `advance()`.
 * Materiais, luzes e pose vêm de sceneRig.ts (os mesmos dos pôsteres estáticos).
 *
 * Largada sem travar a página: o reflexo de ambiente vem pré-calculado do build (environment.ts)
 * e os shaders (MeshPhysicalMaterial com sheen, clearcoat e iridescência são pesados) compilam
 * em paralelo com `compileAsync`; só depois a cena entra no motor e aparece.
 */
export function RibbonScene({ onReady }: RibbonSceneProps) {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const advance = useThree((s) => s.advance)
  const getState = useThree((s) => s.get)
  const size = useThree((s) => s.size)

  const ribbonGroup = useRef<Group>(null)
  const pearlMesh = useRef<InstancedMesh>(null)
  const redrawStill = useRef<(() => void) | null>(null)
  const [envReady, setEnvReady] = useState(false)
  const [compiled, setCompiled] = useState(false)

  const assets = useMemo(() => createSceneAssets(), [])

  // Reflexos do cetim e das pérolas: estúdio neutro do three (RoomEnvironment), pré-calculado
  useEffect(() => {
    const { scene } = getState() // mutação imperativa da cena: pelo estado do R3F, não pelo valor do hook
    const abort = new AbortController()
    let env: Texture | null = null
    loadEnvironment(gl, abort.signal).then(
      (texture) => {
        env = texture
        scene.environment = texture
        setEnvReady(true)
      },
      () => {
        /* abortado no desmonte */
      },
    )
    return () => {
      abort.abort()
      scene.environment = null
      env?.dispose()
    }
  }, [gl, getState])

  useEffect(
    () => () => {
      for (const a of Object.values(assets)) a.dispose()
    },
    [assets],
  )

  // Compila os programas da cena (já com o ambiente: ele muda o shader) fora da thread principal,
  // quando o navegador suporta KHR_parallel_shader_compile; senão, compila do jeito normal.
  useEffect(() => {
    if (!envReady) return
    let cancelled = false
    const done = () => {
      if (!cancelled) setCompiled(true)
    }
    gl.compileAsync(getState().scene, camera).then(done, done)
    return () => {
      cancelled = true
    }
  }, [envReady, gl, camera, getState])

  // Cliente do motor: toda a animação acontece aqui
  useEffect(() => {
    if (!compiled || !ribbonGroup.current || !pearlMesh.current) return
    const pose = createPoser(assets, ribbonGroup.current, pearlMesh.current, camera)
    const sim = { t: 0, amp: 1, rx: 0, ry: 0 }
    let last: FrameState | null = null

    const client: FrameClient = {
      frame(s) {
        last = s
        if (s.still) {
          // Movimento reduzido: cena parada, sem vento nem mouse
          sim.amp = 1
          sim.rx = 0
          sim.ry = 0
        } else {
          sim.t += s.dt
          sim.amp = lerp(sim.amp, windAmplitude(s.velocity), damp(WIND_SMOOTHING, s.dt))
          const tilt = damp(TILT_SMOOTHING, s.dt)
          sim.ry = lerp(sim.ry, s.mouseX * 0.35, tilt)
          sim.rx = lerp(sim.rx, s.mouseY * 0.2, tilt)
        }
        const { width, height } = getState().size
        pose({ p: pageProgress(s.scrollY, s.maxScroll), ...sim, aspect: width / Math.max(height, 1) })
        advance(performance.now())
      },
    }

    // Movimento reduzido: o canvas é limpo quando muda de tamanho; redesenha parado
    redrawStill.current = () => {
      if (last?.still) client.frame(last)
    }

    const remove = scrollEngine.add(client)
    onReady()
    return remove
  }, [compiled, assets, camera, advance, getState, onReady])

  useEffect(() => {
    redrawStill.current?.()
  }, [size.width, size.height])

  return (
    <>
      {LIGHTS.map((l) => (
        <directionalLight key={l.color} position={l.position} intensity={l.intensity} color={l.color} />
      ))}
      {/* frustumCulled false: a esfera de limite é a do plano 1×1 original, não a da fita animada */}
      <group ref={ribbonGroup}>
        <mesh geometry={assets.ribbonGeometry} material={assets.ribbonMaterial} frustumCulled={false} />
      </group>
      <instancedMesh
        ref={pearlMesh}
        args={[assets.pearlGeometry, assets.pearlMaterial, PEARL_COUNT]}
        frustumCulled={false}
      />
    </>
  )
}
