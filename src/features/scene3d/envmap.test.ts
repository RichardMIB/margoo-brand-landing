import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { decodeEnvmap, halfToFloat } from './envmapCodec'
import envmap from './envmap.json'

/**
 * O reflexo pré-calculado (public/envmap) tem o layout CubeUV de uma versão específica do three.
 * Atualizou o three? Rode `npm run bake:env` e faça commit do arquivo novo (ADR 003).
 */
const REGERAR = 'rode `npm run bake:env` e faça commit de public/envmap e envmap.json (ADR 003)'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const installed = JSON.parse(readFileSync('node_modules/three/package.json', 'utf8')).version
const file = readFileSync(`public/${envmap.file}`)

describe('envmap pré-calculado', () => {
  it('foi gerado com a versão do three do package.json', () => {
    const declared = String(pkg.dependencies.three).replace(/^[~^=]/, '')
    expect(declared, `three mudou no package.json: ${REGERAR}`).toBe(envmap.three)
  })

  it('foi gerado com a versão do three instalada', () => {
    expect(installed, `three instalado mudou: ${REGERAR}`).toBe(envmap.three)
  })

  it('o arquivo é o mesmo que o bake gravou (sem edição manual nem arquivo velho)', () => {
    expect(createHash('sha256').update(file).digest('hex'), REGERAR).toBe(envmap.sha256)
  })

  it('fica abaixo de 150 kB', () => {
    expect(file.length).toBeLessThan(150 * 1024)
  })

  it('decodifica no tamanho do CubeUV e guarda brilho HDR (acima de 1)', () => {
    const half = decodeEnvmap(new Uint8Array(gunzipSync(file)), envmap.width)
    expect(half.length).toBe(envmap.width * envmap.height * 4)
    // Layout CubeUV do three para este tamanho: 3 × max(size, 112) por 4 × size
    expect(envmap.width).toBe(3 * Math.max(envmap.size, 16 * 7))
    expect(envmap.height).toBe(4 * envmap.size)
    let peak = 0
    for (let i = 0; i < half.length; i += 4) peak = Math.max(peak, halfToFloat(half[i]))
    expect(peak).toBeGreaterThan(1)
  })
})
