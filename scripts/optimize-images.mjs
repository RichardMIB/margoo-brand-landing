// Converte as fotos de referencia/ em WebP (480 e 960 px de largura) para public/img/
// e grava src/data/images.generated.json com as larguras reais de cada arquivo.
// Fotos menores que 960 px não são ampliadas: o manifesto registra a largura verdadeira,
// para o srcset nunca prometer ao navegador mais resolução do que o arquivo tem.
// Uso: npm run images
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const sources = ['referencia/img', 'referencia/img2'].map((d) => path.join(root, d))
const outDir = path.join(root, 'public', 'img')
const manifestPath = path.join(root, 'src', 'data', 'images.generated.json')
const WIDTHS = [480, 960]
const QUALITY = 78

await mkdir(outDir, { recursive: true })

const manifest = {}
for (const dir of sources) {
  const files = (await readdir(dir)).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort()
  for (const file of files) {
    const name = path.parse(file).name
    if (manifest[name]) throw new Error(`Nome de foto repetido: ${name}`)
    const input = path.join(dir, file)
    const meta = await sharp(input).metadata()
    const variants = []
    for (const width of WIDTHS) {
      const out = path.join(outDir, `${name}-${width}.webp`)
      const info = await sharp(input)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(out)
      variants.push({ file: `/img/${name}-${width}.webp`, width: info.width })
    }
    manifest[name] = { width: meta.width, height: meta.height, variants }
    console.log(`${file} → ${variants.map((v) => `${v.width}w`).join(', ')}`)
  }
}

await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
console.log(`\n${Object.keys(manifest).length} fotos. Manifesto: ${path.relative(root, manifestPath)}`)
