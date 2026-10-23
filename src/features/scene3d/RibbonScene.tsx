import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Color,
  DoubleSide,
  Euler,
  type Group,
  InstancedMesh,
  Matrix4,
  MeshPhysicalMaterial,
  PMREMGenerator,
  type PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { damp, lerp } from '../../lib/math'
import { scrollEngine, type FrameClient, type FrameState } from '../motion/scrollEngine'
import {
  CAMERA_FOV,
  PEARL_COUNT,
  cameraDistance,
  createPearls,
  pageProgress,
  pearlPose,
  ribbonPose,
  visibleHeight,
  windAmplitude,
  type PearlPose,
} from './choreography'
import { RIBBON_ACROSS, RIBBON_SEGMENTS, writeRibbonPositions } from './ribbon'

/** Frações por quadro de 60 Hz (protótipo), convertidas pelo damp. */
const WIND_SMOOTHING = 0.08
const TILT_SMOOTHING = 0.05
/**
 * Resolução do reflexo de ambiente. 128 aceita rugosidade a partir de 0.076 (o menor valor dos
 * materiais é 0.1, o verniz das pérolas) e custa 1/4 do padrão de 256 para gerar.
 */
const ENV_SIZE = 128

interface RibbonSceneProps {
  /** Shaders compilados e primeiro quadro pedido: a camada pode aparecer. */
  onReady(): void
}

/**
 * Fita de cetim caramelo + 25 pérolas. Não tem loop próprio: registra-se no scrollEngine,
 * atualiza a cena a cada quadro do motor e pede um único desenho ao R3F com `advance()`.
 *
 * Largada sem travar a página: os shaders (MeshPhysicalMaterial com sheen, clearcoat e
 * iridescência são pesados) compilam em paralelo com `compileAsync`; só depois a cena entra
 * no motor e aparece.
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
  const [compiled, setCompiled] = useState(false)

  const assets = useMemo(
    () => ({
      ribbonGeometry: new PlaneGeometry(1, 1, RIBBON_SEGMENTS, RIBBON_ACROSS),
      ribbonMaterial: new MeshPhysicalMaterial({
        color: 0xa9824f,
        roughness: 0.3,
        metalness: 0.05,
        sheen: 1,
        sheenRoughness: 0.3,
        sheenColor: new Color(0xfff1da),
        clearcoat: 0.5,
        clearcoatRoughness: 0.22,
        side: DoubleSide,
      }),
      pearlGeometry: new SphereGeometry(1, 40, 40),
      pearlMaterial: new MeshPhysicalMaterial({
        color: 0xf8f2e8,
        roughness: 0.16,
        iridescence: 1,
        iridescenceIOR: 1.6,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
      }),
    }),
    [],
  )
  const pearls = useMemo(() => createPearls(), [])

  // Reflexos do cetim e das pérolas: estúdio neutro do three (sem HDR externo)
  useEffect(() => {
    const { scene } = getState() // mutação imperativa da cena: pelo estado do R3F, não pelo valor do hook
    const pmrem = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const env = pmrem.fromScene(room, 0.04, 0.1, 100, { size: ENV_SIZE }).texture
    scene.environment = env
    room.dispose()
    pmrem.dispose()
    return () => {
      scene.environment = null
      env.dispose()
    }
  }, [gl, getState])

  useEffect(
    () => () => {
      for (const a of Object.values(assets)) a.dispose()
    },
    [assets],
  )

  // Compila os programas da cena (já com o ambiente) fora da thread principal, quando o
  // navegador suporta KHR_parallel_shader_compile; senão, compila do jeito normal.
  useEffect(() => {
    let cancelled = false
    const done = () => {
      if (!cancelled) setCompiled(true)
    }
    gl.compileAsync(getState().scene, camera).then(done, done)
    return () => {
      cancelled = true
    }
  }, [gl, camera, getState])

  // Cliente do motor: toda a animação acontece aqui
  useEffect(() => {
    if (!compiled) return
    const positions = assets.ribbonGeometry.attributes.position
    const sim = { t: 0, amp: 1, rx: 0, ry: 0 }
    const pose: PearlPose = { x: 0, y: 0, z: 0, scale: 0 }
    const matrix = new Matrix4()
    const quat = new Quaternion()
    const euler = new Euler()
    const pos = new Vector3()
    const scl = new Vector3()
    let last: FrameState | null = null

    const client: FrameClient = {
      frame(s) {
        const group = ribbonGroup.current
        const mesh = pearlMesh.current
        if (!group || !mesh) return
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

        // Câmera e tamanho visível (o colar se ajusta à largura da tela)
        const { width, height } = getState().size
        const aspect = width / Math.max(height, 1)
        const distance = cameraDistance(aspect)
        if (camera.position.z !== distance) {
          camera.position.z = distance
          camera.updateProjectionMatrix()
        }
        const visH = visibleHeight(CAMERA_FOV, distance)
        const visW = visH * aspect

        const p = pageProgress(s.scrollY, s.maxScroll)
        const r = ribbonPose(p)
        writeRibbonPositions(positions.array as Float32Array, sim.t, r.phase, sim.amp)
        positions.needsUpdate = true
        assets.ribbonGeometry.computeVertexNormals()
        group.position.set(r.x, r.y, 0)
        group.rotation.set(-0.12 + sim.rx, sim.ry, r.rotationZ)
        group.scale.setScalar(r.scale)

        quat.setFromEuler(euler.set(0, sim.t * 0.2, 0))
        pearls.forEach((pearl, i) => {
          pearlPose(pearl, p, sim.t, visW, visH, pose)
          mesh.setMatrixAt(i, matrix.compose(pos.set(pose.x, pose.y, pose.z), quat, scl.setScalar(pose.scale)))
        })
        mesh.instanceMatrix.needsUpdate = true

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
  }, [compiled, assets, pearls, camera, advance, getState, onReady])

  useEffect(() => {
    redrawStill.current?.()
  }, [size.width, size.height])

  return (
    <>
      <directionalLight position={[4, 6, 8]} intensity={1.5} />
      <directionalLight position={[-6, -2, -4]} intensity={0.9} color={0xffe9cc} />
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
