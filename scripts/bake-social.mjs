// Imagem de compartilhamento (Open Graph 1200×630) e ícones PNG a partir do favicon.svg.
//
// A imagem de compartilhamento é um print real do topo do site (build atual, 3D ao vivo),
// no tamanho exato que WhatsApp, Instagram e LinkedIn usam na prévia do link.
// Regerar quando o topo do site mudar (fotos definitivas, textos).
//
// Uso: npm run bake:social   (gera o build antes)
// Saída: public/og.jpg, public/apple-touch-icon.png (180), public/favicon-32.png
import { writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { launchChrome, sleep, startPreview } from './lib/chrome.mjs'

// Ícones: o SVG é a fonte; PNG só para quem não lê SVG (iOS na tela inicial, navegadores antigos)
const svg = 'public/favicon.svg'
await sharp(svg, { density: 300 }).resize(180, 180).png().toFile('public/apple-touch-icon.png')
await sharp(svg, { density: 300 }).resize(32, 32).png().toFile('public/favicon-32.png')
console.log('✓ public/apple-touch-icon.png e public/favicon-32.png')

const server = await startPreview()
const cdp = await launchChrome()
try {
  await cdp.send('Page.enable')
  // 8 núcleos: garante o 3D ao vivo no print, independente da máquina (ADR 004)
  await cdp.send('Emulation.setHardwareConcurrencyOverride', { hardwareConcurrency: 8 })
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false })
  await cdp.send('Page.navigate', { url: server.url })
  for (let i = 0; i < 100 && !(await cdp.evaluate(() => !!document.querySelector('div.scene-layer.is-ready canvas'))); i++)
    await sleep(150)
  // eager antes do decode: foto lazy fora da tela nunca carrega e o decode() esperaria para sempre
  await cdp.evaluate(() => Promise.all([...document.images].map((i) => ((i.loading = 'eager'), i.decode().catch(() => {})))))
  await sleep(1500) // fade da cena
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
  const jpg = await sharp(Buffer.from(shot.data, 'base64')).jpeg({ quality: 84, mozjpeg: true }).toBuffer()
  writeFileSync('public/og.jpg', jpg)
  console.log(`✓ public/og.jpg (1200×630, ${(jpg.length / 1024).toFixed(1)} kB)`)
} finally {
  cdp.close()
  await server.close()
}
