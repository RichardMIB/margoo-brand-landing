import {
  CubeUVReflectionMapping,
  DataTexture,
  HalfFloatType,
  LinearFilter,
  LinearSRGBColorSpace,
  PMREMGenerator,
  RGBAFormat,
  type Texture,
  type WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { decodeEnvmap } from './envmapCodec'
import envmap from './envmap.json'

/**
 * Reflexo de ambiente da cena (o "estúdio" que brilha no cetim e nas pérolas).
 *
 * Caminho normal: baixa o PMREM pré-calculado no build (npm run bake:env, ~46 kB) e monta a
 * textura CubeUV direto. O three usa textura CubeUV como está, sem rodar o PMREM: nenhum
 * shader extra para compilar (ao vivo, isso travava a página por ~2,3 s).
 *
 * Reserva: se o arquivo falhar ou o navegador não tiver DecompressionStream (Safari < 16.4),
 * gera ao vivo com os mesmos parâmetros. Mesmo visual, só mais lento.
 */
export async function loadEnvironment(gl: WebGLRenderer, signal: AbortSignal): Promise<Texture> {
  try {
    return await loadBaked(signal)
  } catch (error) {
    if (signal.aborted) throw error
    console.warn('Reflexo pré-calculado indisponível, gerando ao vivo:', error)
    return generateLive(gl)
  }
}

async function loadBaked(signal: AbortSignal): Promise<Texture> {
  if (typeof DecompressionStream === 'undefined') throw new Error('sem DecompressionStream')
  const res = await fetch(`${import.meta.env.BASE_URL}${envmap.file}`, { signal })
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
  const bytes = new Uint8Array(await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer())
  if (bytes.length !== envmap.width * envmap.height * 4) throw new Error('tamanho inesperado')

  // Mesmas propriedades da textura que o PMREMGenerator criaria
  const texture = new DataTexture(decodeEnvmap(bytes, envmap.width), envmap.width, envmap.height, RGBAFormat, HalfFloatType)
  texture.mapping = CubeUVReflectionMapping
  texture.colorSpace = LinearSRGBColorSpace
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

function generateLive(gl: WebGLRenderer): Texture {
  const pmrem = new PMREMGenerator(gl)
  const room = new RoomEnvironment()
  const texture = pmrem.fromScene(room, envmap.sigma, envmap.near, envmap.far, { size: envmap.size }).texture
  room.dispose()
  pmrem.dispose()
  return texture
}
