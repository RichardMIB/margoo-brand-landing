// Pré-calcula o reflexo de ambiente da cena 3D (saída do PMREM do RoomEnvironment).
//
// Por quê: gerar o PMREM no navegador compila shaders de forma síncrona e travava a página por
// ~2,3 s (docs/performance.md, ADR 003). O resultado é sempre o mesmo, então é gerado uma vez
// aqui, no Chrome headless com GPU, e a página só baixa e decodifica o arquivo.
//
// Precisa ser regerado ao atualizar o three (o layout CubeUV pode mudar): o teste
// envmap.test.ts falha se a versão instalada for diferente da gravada no envmap.json.
//
// Uso:  npm run bake:env                  (tamanho padrão)
//       node scripts/bake-envmap.mjs --size 128 --compare 32,64,128
// Saída: public/envmap/room-<size>.rgbe.bin (RGBE + filtro Paeth + gzip) e src/features/scene3d/envmap.json
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { gzipSync, constants as zlib } from 'node:zlib'
import sharp from 'sharp'
import { decodeEnvmap, encodeEnvmap, halfToFloat, subFilter, unPaethFilter } from '../src/features/scene3d/envmapCodec.ts'
import { launchChrome, sleep } from './lib/chrome.mjs'

const { values: args } = parseArgs({
  options: {
    // 128: mais perto do PMREM padrão (256, visual aprovado) dentro do limite de 150 kB (ADR 003)
    size: { type: 'string', default: '128' },
    compare: { type: 'string', default: '32,64,128' },
  },
})
const SIZE = Number(args.size)
const SIZES = [...new Set([...args.compare.split(',').map(Number), SIZE])].sort((a, b) => a - b)
// Mesmos parâmetros que a página usava ao vivo (RibbonScene)
const PMREM = { sigma: 0.04, near: 0.1, far: 100 }
const OUT_DIR = 'public/envmap'
const META = 'src/features/scene3d/envmap.json'

const gz = (buf) => gzipSync(buf, { level: zlib.Z_BEST_COMPRESSION })
const kb = (n) => `${(n / 1024).toFixed(1)} kB`

// ---------- Gera os pixels no Chrome ----------
const { createServer } = await import('vite')
const server = await createServer({ logLevel: 'silent', server: { port: 4319, strictPort: false } })
await server.listen()
const cdp = await launchChrome()
const results = new Map()
try {
  await cdp.send('Page.navigate', { url: new URL('scripts/bake-envmap.html', server.resolvedUrls.local[0]).href })
  for (let i = 0; i < 100 && !(await cdp.evaluate(() => window.bakeReady === true)); i++) await sleep(200)
  const renderer = await cdp.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2')
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '?'
  })
  if (/swiftshader|llvmpipe|software/i.test(renderer)) console.warn(`⚠ WebGL por software (${renderer}): resultado igual, só mais lento`)
  for (const size of SIZES) {
    const r = await cdp.evaluate((p) => window.bake(p), { size, ...PMREM })
    const buf = Buffer.from(r.data, 'base64')
    results.set(size, { width: r.width, height: r.height, half: new Uint16Array(buf.buffer, buf.byteOffset, buf.length / 2) })
  }
} finally {
  cdp.close()
  await server.close()
}

// ---------- Compara formatos ----------
const toFloats = (half) => Float32Array.from(half, halfToFloat)

/** Maior erro relativo ao canal mais forte do pixel (onde o olho percebe). */
function maxError(original, decoded) {
  let worst = 0
  for (let p = 0; p < original.length; p += 4) {
    const max = Math.max(original[p], original[p + 1], original[p + 2])
    if (max < 1e-3) continue
    for (let c = 0; c < 3; c++) worst = Math.max(worst, Math.abs(original[p + c] - decoded[p + c]) / max)
  }
  return worst
}

/** RGBM em 8 bits: cor / (M * alcance), M no alfa. */
function rgbm(floats, range) {
  const out = new Uint8Array(floats.length)
  const back = new Float32Array(floats.length)
  for (let p = 0; p < floats.length; p += 4) {
    const max = Math.max(floats[p], floats[p + 1], floats[p + 2], 1e-6) / range
    const m = Math.min(Math.ceil(Math.min(max, 1) * 255), 255)
    out[p + 3] = m
    for (let c = 0; c < 3; c++) {
      out[p + c] = Math.min(Math.round((floats[p + c] / ((m / 255) * range)) * 255), 255)
      back[p + c] = (out[p + c] / 255) * (m / 255) * range
    }
  }
  return { out, back }
}

const png = (raw, width, height) =>
  sharp(Buffer.from(raw), { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9, effort: 10 }).toBuffer()

const rows = []
for (const [size, { width, height, half }] of results) {
  const floats = toFloats(half)
  let peak = 0
  for (let p = 0; p < floats.length; p += 4) peak = Math.max(peak, floats[p], floats[p + 1], floats[p + 2])
  const rgb = new Uint16Array((half.length / 4) * 3)
  for (let p = 0, q = 0; p < half.length; p += 4) (rgb[q++] = half[p]), (rgb[q++] = half[p + 1]), (rgb[q++] = half[p + 2])

  const filtered = encodeEnvmap(half, width)
  const rgbeErr = maxError(floats, toFloats(decodeEnvmap(filtered.slice(), width)))
  const rgbeRaw = unPaethFilter(filtered.slice(), width) // RGBE sem o filtro, para comparar
  const range = Math.ceil(peak)
  const m = rgbm(floats, range)

  const add = (format, bytes, err) => rows.push({ size, dims: `${width}×${height}`, format, bytes, err })
  add('half float RGBA + gzip', gz(Buffer.from(half.buffer, half.byteOffset, half.byteLength)).length, 0)
  add('half float RGB + gzip', gz(Buffer.from(rgb.buffer)).length, 0)
  add('RGBE 8 bits em PNG', (await png(rgbeRaw, width, height)).length, rgbeErr)
  add('RGBE 8 bits + gzip', gz(rgbeRaw).length, rgbeErr)
  add('RGBE 8 bits + filtro Sub + gzip', gz(subFilter(rgbeRaw.slice(), width)).length, rgbeErr)
  add('RGBE 8 bits + filtro Paeth + gzip', gz(filtered).length, rgbeErr)
  add(`RGBM 8 bits (alcance ${range}) em PNG`, (await png(m.out, width, height)).length, maxError(floats, m.back))
  results.get(size).peak = peak
}

console.log('\n| CubeUV | Pixels | Formato | Tamanho | Erro máx. |')
console.log('|---|---|---|---|---|')
for (const r of rows)
  console.log(`| ${r.size} | ${r.dims} | ${r.format} | ${kb(r.bytes)} | ${r.err ? `${(r.err * 100).toFixed(2)}%` : 'exato'} |`)

// ---------- Grava o escolhido: RGBE + filtro Paeth + gzip ----------
const chosen = results.get(SIZE)
const file = `room-${SIZE}.rgbe.bin`
const data = gz(encodeEnvmap(chosen.half, chosen.width))
mkdirSync(OUT_DIR, { recursive: true })
for (const old of readdirSync(OUT_DIR)) if (old !== file) rmSync(`${OUT_DIR}/${old}`)
writeFileSync(`${OUT_DIR}/${file}`, data)

const three = JSON.parse(readFileSync('node_modules/three/package.json', 'utf8')).version
const meta = {
  $comment: 'Gerado por npm run bake:env. Regerar ao atualizar o three (ADR 003).',
  three,
  file: `envmap/${file}`, // relativo ao BASE_URL do Vite
  format: 'rgbe-paeth-gzip',
  size: SIZE,
  width: chosen.width,
  height: chosen.height,
  ...PMREM,
  bytes: data.length,
  sha256: createHash('sha256').update(data).digest('hex'),
}
writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`)
console.log(`\n✓ ${OUT_DIR}/${file} (${kb(data.length)}, three ${three}) e ${META}`)
