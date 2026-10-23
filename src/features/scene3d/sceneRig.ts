import {
  Color,
  DoubleSide,
  Euler,
  type Group,
  type InstancedMesh,
  Matrix4,
  MeshPhysicalMaterial,
  type PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three'
import {
  CAMERA_FOV,
  cameraDistance,
  createPearls,
  pearlPose,
  ribbonPose,
  visibleHeight,
  type PearlPose,
} from './choreography'
import { RIBBON_ACROSS, RIBBON_SEGMENTS, writeRibbonPositions } from './ribbon'

/**
 * A cena "Fio + colar" sem React: materiais, luzes e a pose de cada quadro.
 * Usada pelo componente ao vivo (RibbonScene) e pelo script que gera os pôsteres estáticos
 * (scripts/bake-posters.mjs), para os dois desenharem exatamente a mesma coisa.
 */

/** Luzes do protótipo: principal branca e contraluz quente. */
export const LIGHTS = [
  { position: [4, 6, 8] as const, intensity: 1.5, color: 0xffffff },
  { position: [-6, -2, -4] as const, intensity: 0.9, color: 0xffe9cc },
]

/** Exposição do tone mapping ACES (protótipo). */
export const TONE_MAPPING_EXPOSURE = 1.1

export function createSceneAssets() {
  return {
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
  }
}

export type SceneAssets = ReturnType<typeof createSceneAssets>

export interface PoseInput {
  /** Progresso da página, 0..1. */
  p: number
  /** Tempo em segundos (0 = cena parada). */
  t: number
  /** Amplitude do vento (1 = parado). */
  amp: number
  /** Inclinação pelo mouse (radianos). */
  rx: number
  ry: number
  /** Largura / altura do canvas. */
  aspect: number
}

/** Devolve a função que posiciona fita, pérolas e câmera para um quadro. */
export function createPoser(
  assets: SceneAssets,
  ribbonGroup: Group,
  pearlMesh: InstancedMesh,
  camera: PerspectiveCamera,
) {
  const pearls = createPearls()
  const positions = assets.ribbonGeometry.attributes.position
  const pose: PearlPose = { x: 0, y: 0, z: 0, scale: 0 }
  const matrix = new Matrix4()
  const quat = new Quaternion()
  const euler = new Euler()
  const pos = new Vector3()
  const scl = new Vector3()

  return ({ p, t, amp, rx, ry, aspect }: PoseInput) => {
    // Câmera e tamanho visível (o colar se ajusta à largura da tela)
    const distance = cameraDistance(aspect)
    if (camera.position.z !== distance || camera.aspect !== aspect) {
      camera.position.z = distance
      camera.aspect = aspect
      camera.updateProjectionMatrix()
    }
    const visH = visibleHeight(CAMERA_FOV, distance)
    const visW = visH * aspect

    const r = ribbonPose(p)
    writeRibbonPositions(positions.array as Float32Array, t, r.phase, amp)
    positions.needsUpdate = true
    assets.ribbonGeometry.computeVertexNormals()
    ribbonGroup.position.set(r.x, r.y, 0)
    ribbonGroup.rotation.set(-0.12 + rx, ry, r.rotationZ)
    ribbonGroup.scale.setScalar(r.scale)

    quat.setFromEuler(euler.set(0, t * 0.2, 0))
    pearls.forEach((pearl, i) => {
      pearlPose(pearl, p, t, visW, visH, pose)
      pearlMesh.setMatrixAt(i, matrix.compose(pos.set(pose.x, pose.y, pose.z), quat, scl.setScalar(pose.scale)))
    })
    pearlMesh.instanceMatrix.needsUpdate = true
  }
}
