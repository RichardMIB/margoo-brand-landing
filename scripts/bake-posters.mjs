// Pôsteres estáticos da cena 3D para celular e aparelhos fracos (ADR 004).
//
// Desenha a cena real (src/features/scene3d/sceneRig.ts, mesmo reflexo pré-calculado e mesma
// câmera) parada no tempo 0, no Chrome headless com GPU, em duas posições: a fita no topo da
// página (progresso 0) e o colar de pérolas no fim (progresso 1). Cada uma em paisagem (desktop
// fraco) e retrato (celular), porque a câmera da cena muda de distância conforme a proporção.
//
// Saída: public/posters/{fita,colar}-{desktop,mobile}.webp (fundo transparente, < 60 kB cada).
// Regerar quando mudar a cena (materiais, luzes, coreografia) ou o three.
//
// Uso: npm run bake:posters
import { mkdirSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { launchChrome, sleep } from './lib/chrome.mjs'

const OUT_DIR = 'public/posters'
const MAX_BYTES = 60 * 1024
/** Mesmos tamanhos de referência dos dois layouts: notebook 16:10 e celular ~19,5:9. */
const VIEWS = {
  desktop: { width: 1600, height: 1000, dpr: 1 },
  mobile: { width: 390, height: 844, dpr: 2 },
}
const SHOTS = { fita: 0, colar: 1 }

const { createServer } = await import('vite')
const server = await createServer({ logLevel: 'silent', server: { port: 4320, strictPort: false } })
await server.listen()
const cdp = await launchChrome()
const rows = []
try {
  await cdp.send('Page.navigate', { url: new URL('scripts/bake-posters.html', server.resolvedUrls.local[0]).href })
  for (let i = 0; i < 100 && !(await cdp.evaluate(() => window.posterReady === true)); i++) await sleep(200)
  mkdirSync(OUT_DIR, { recursive: true })

  for (const [shot, p] of Object.entries(SHOTS)) {
    for (const [view, size] of Object.entries(VIEWS)) {
      const png = Buffer.from(await cdp.evaluate((args) => window.renderPoster(args), { ...size, p }), 'base64')
      // Menor qualidade que ainda cabe em 60 kB, começando alta
      let quality = 92
      let webp
      do {
        webp = await sharp(png).webp({ quality, alphaQuality: 90, effort: 6, smartSubsample: true }).toBuffer()
        quality -= 4
      } while (webp.length > MAX_BYTES && quality >= 40)
      if (webp.length > MAX_BYTES) throw new Error(`${shot}-${view}: ${webp.length} bytes, acima de 60 kB`)
      const file = `${OUT_DIR}/${shot}-${view}.webp`
      writeFileSync(file, webp)
      const { width, height } = await sharp(webp).metadata()
      rows.push(`| ${shot}-${view}.webp | ${width}×${height} | ${quality + 4} | ${(webp.length / 1024).toFixed(1)} kB |`)
    }
  }
} finally {
  cdp.close()
  await server.close()
}
console.log('\n| Arquivo | Pixels | Qualidade WebP | Tamanho |\n|---|---|---|---|')
console.log(rows.join('\n'))
