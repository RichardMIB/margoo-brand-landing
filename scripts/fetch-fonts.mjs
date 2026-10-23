// Baixa as fontes do Google Fonts uma vez para hospedar no próprio site (sem conexão com
// terceiros a cada visita: LGPD e sem CSS externo bloqueando a pintura).
//
// Só o que a página usa: Bodoni Moda 400 normal (eixo óptico "opsz" variável, que ajusta o
// desenho ao tamanho do texto) e Jost 300–500 (variável). Subconjuntos latin e latin-ext.
// Licença das duas: SIL Open Font License 1.1 (permite hospedar e redistribuir).
//
// Saída: public/fonts/*.woff2 e src/styles/fonts.css. Uso: npm run fonts
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'

const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400&family=Jost:wght@300..500&display=swap'
const SUBSETS = ['latin', 'latin-ext']
const OUT_DIR = 'public/fonts'
// Com user agent de navegador moderno o Google devolve woff2 com unicode-range por subconjunto
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text()
const blocks = [...css.matchAll(/\/\* ([\w-]+) \*\/\s*@font-face\s*{([^}]+)}/g)]
  .map(([, subset, body]) => ({
    subset,
    family: body.match(/font-family:\s*'([^']+)'/)[1],
    style: body.match(/font-style:\s*(\w+)/)[1],
    weight: body.match(/font-weight:\s*([\d ]+);/)[1].trim(),
    url: body.match(/url\(([^)]+)\)/)[1],
    range: body.match(/unicode-range:\s*([^;]+);/)[1].trim(),
  }))
  .filter((b) => SUBSETS.includes(b.subset))
if (blocks.length !== SUBSETS.length * 2) throw new Error(`Esperava ${SUBSETS.length * 2} arquivos, veio ${blocks.length}`)

mkdirSync(OUT_DIR, { recursive: true })
for (const old of readdirSync(OUT_DIR)) rmSync(`${OUT_DIR}/${old}`)

const faces = []
for (const b of blocks) {
  const file = `${b.family.toLowerCase().replace(/\s+/g, '-')}-${b.subset}.woff2`
  const data = Buffer.from(await (await fetch(b.url)).arrayBuffer())
  writeFileSync(`${OUT_DIR}/${file}`, data)
  console.log(`${file}: ${(data.length / 1024).toFixed(1)} kB (peso ${b.weight})`)
  faces.push(`/* ${b.family} ${b.weight}, ${b.subset} */
@font-face {
  font-family: '${b.family}';
  font-style: ${b.style};
  font-weight: ${b.weight};
  font-display: swap;
  src: url('/fonts/${file}') format('woff2');
  unicode-range: ${b.range};
}`)
}

writeFileSync(
  'src/styles/fonts.css',
  `/* Gerado por npm run fonts (scripts/fetch-fonts.mjs). Fontes: SIL Open Font License 1.1. */\n\n${faces.join('\n\n')}\n`,
)
console.log('✓ src/styles/fonts.css')
