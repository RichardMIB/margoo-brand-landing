// Checagem de layout num Chrome real (headless), com o motor de scroll ligado.
//
// Regra do CLAUDE.md: nenhuma foto cobre título, legenda ou botão, em nenhuma posição do scroll.
// Para cada largura, rola a página por várias posições (início, meio e fim de cada seção com
// movimento + uma varredura a cada meia tela), com o mouse no centro e nos cantos, e mede:
//   - foto x texto: interseção dos retângulos (texto medido pelas linhas reais, via Range);
//   - vazamento lateral: algo além da borda da tela ou rolagem horizontal;
//   - letreiro: as duas linhas sempre cobrindo da borda esquerda à direita.
// Depois repete com prefers-reduced-motion: reduce e confere que nada foi animado.
// Também exige a cena 3D carregada e abre a página direto em #loja, #ocasioes e #atendimento
// para conferir que o destino continua no topo depois que a vitrine fixada cresce.
//
// Sem dependências: o Chrome instalado é controlado pelo protocolo de depuração (CDP) usando o
// WebSocket nativo do Node 22+, e o servidor é o `vite preview` pela API do próprio Vite.
//
// Uso:  npm run check:layout                       (gera o build e testa)
//       node scripts/check-layout.mjs --url http://localhost:5173 --viewports 360x900,1366x650
// Saída: .layout-check/ (prints da página e das falhas). Código 1 se achar problema.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { launchChrome, sleep, startPreview } from './lib/chrome.mjs'

const { values: args } = parseArgs({
  options: {
    url: { type: 'string' },
    // 1366x650: notebook comum com barra do navegador, o caso mais apertado da vitrine fixada
    viewports: { type: 'string', default: '360x900,768x900,1280x900,1440x900,1920x900,1366x650' },
    'no-scene': { type: 'boolean', default: false },
    out: { type: 'string', default: '.layout-check' },
  },
})
const VIEWPORTS = args.viewports.split(',').map((v) => v.split('x').map(Number))
const REQUIRE_SCENE = !args['no-scene']
const HASH_TARGETS = ['ocasioes', 'loja', 'atendimento']
const OUT = path.resolve(args.out)
const DESKTOP = 901 // a partir daqui o mouse mexe nas fotos (ponteiro fino)
const MAX_FAIL_SHOTS = 12

// ---------- Funções que rodam DENTRO da página (serializadas com toString) ----------

/** Espera fontes, imagens e alguns quadros do motor. */
async function settle(frames) {
  await document.fonts.ready
  for (let i = 0; i < frames; i++) await new Promise((r) => requestAnimationFrame(r))
}

/** Posições de scroll a testar: início/meio/fim de cada seção com movimento + varredura. */
function scrollPositions() {
  const vh = innerHeight
  const max = document.documentElement.scrollHeight - vh
  const sections = [
    ['Hero', '#topo'],
    ['Letreiro', '[data-marquee]'],
    ['Ocasiões', '#ocasioes'],
    ['Vitrine', '#vitrine'],
    ['Passos', '[data-line]'],
    ['Loja', '#loja'],
  ]
  const out = []
  for (const [name, sel] of sections) {
    const el = document.querySelector(sel)?.closest('section')
    if (!el) continue
    const top = el.getBoundingClientRect().top + scrollY
    const h = el.offsetHeight
    out.push([`${name} início`, top - vh * 0.75], [`${name} meio`, top + h / 2 - vh / 2], [`${name} fim`, top + h - vh * 0.25])
  }
  for (let y = 0; y <= max; y += vh / 2) out.push([`varredura`, y])
  return out.map(([label, y]) => [label, Math.round(Math.min(Math.max(y, 0), max))])
}

/** Mede o quadro atual. Devolve a lista de problemas (vazia = ok). */
function measure() {
  const W = innerWidth
  const H = innerHeight
  const problems = []
  const visible = (r) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < H
  const hidden = (el) => el.closest('.sr-only,[hidden]')
  /** Texto corrido: retângulo das linhas reais, não da caixa do bloco. Pílulas e botões: a caixa inteira. */
  const textRect = (el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    return range.getBoundingClientRect()
  }
  const area = (a, b) =>
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  const name = (el) =>
    el.tagName === 'IMG' ? `foto "${el.alt.slice(0, 40)}"` : `${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 32)}"`

  const photos = [...document.querySelectorAll('.float')]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter((p) => visible(p.r))
  const texts = [
    ...[...document.querySelectorAll('h1,h2,h3,p,address,.rail-item > span')].map((el) => ({ el, r: textRect(el) })),
    ...[...document.querySelectorAll('figcaption,.glass-btn,.glass-card')].map((el) => ({ el, r: el.getBoundingClientRect() })),
  ].filter((t) => !hidden(t.el) && visible(t.r))

  for (const p of photos)
    for (const t of texts) {
      if (p.el.contains(t.el)) continue // legenda dentro da própria foto
      const a = area(p.r, t.r)
      if (a > 4) problems.push(`${name(p.el.querySelector('img'))} cobre ${name(t.el)} (${Math.round(a)}px²)`)
    }

  if (document.documentElement.scrollWidth > W) {
    // Culpado: o elemento mais externo que passa da borda sem um ancestral que o corte
    const clipped = (el) => {
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement)
        if (getComputedStyle(a).overflowX !== 'visible') return true
      return false
    }
    const culprits = [...document.body.querySelectorAll('*')]
      .filter((el) => el.getBoundingClientRect().right > W + 1 && !clipped(el))
      .filter((el, _, all) => !all.includes(el.parentElement))
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} (até ${Math.round(el.getBoundingClientRect().right)}px)`)
    problems.push(`rolagem horizontal: página com ${document.documentElement.scrollWidth}px — ${culprits.join(', ') || 'culpado não identificado'}`)
  }
  for (const item of [...photos, ...texts]) {
    if (item.el.closest('.marquee-row,.rail-track')) continue // passam da borda de propósito (cortados pelo pai)
    if (item.r.right > W + 1 || item.r.left < -1) problems.push(`vaza da tela: ${name(item.el)} (${Math.round(item.r.left)}..${Math.round(item.r.right)})`)
  }

  for (const row of document.querySelectorAll('[data-marquee]')) {
    if (!visible(row.getBoundingClientRect())) continue
    const first = row.firstElementChild.getBoundingClientRect()
    const last = row.lastElementChild.getBoundingClientRect()
    if (first.left > 0.5) problems.push(`letreiro ${row.dataset.marquee}: borda esquerda vazia (${Math.round(first.left)}px)`)
    if (last.right < W - 0.5) problems.push(`letreiro ${row.dataset.marquee}: borda direita vazia (${Math.round(W - last.right)}px)`)
  }
  return problems
}

/** Com movimento reduzido nada pode estar animado: sem transform/clip-path inline e sem vitrine fixada. */
function staticState() {
  const problems = []
  const sel = '[data-depth],[data-marquee],[data-slide],[data-drift],[data-line],[data-reveal],[data-rail-track],[data-rail-bar],.float img'
  for (const el of document.querySelectorAll(sel)) {
    if (el.style.transform || el.style.clipPath) problems.push(`animado com movimento reduzido: ${el.tagName.toLowerCase()} ${el.getAttribute('class') ?? ''}`)
  }
  if (document.querySelector('.rail.is-pinned')) problems.push('vitrine fixada com movimento reduzido')
  return problems
}

/** Com movimento: o motor precisa estar rodando (algo animado) e a vitrine fixada só a partir de 761px. */
function motionState() {
  const problems = []
  if (!document.querySelector('[data-drift][style*="transform"], .float img[style*="transform"]')) problems.push('motor de scroll não aplicou nenhum efeito')
  const pinned = !!document.querySelector('.rail.is-pinned')
  if (pinned !== innerWidth >= 761) problems.push(`vitrine ${pinned ? 'fixada' : 'em carrossel'} em ${innerWidth}px`)
  return problems
}

/** Espera a cena 3D (lazy, depois do load e de um momento ocioso). */
async function waitScene() {
  for (let i = 0; i < 80; i++) {
    const c = document.querySelector('canvas')
    if (c && c.width > 0) return true
    await new Promise((r) => setTimeout(r, 100))
  }
  return false
}

/** Link direto: o destino precisa estar no topo da tela. */
function hashTargetTop(id) {
  return Math.round(document.getElementById(id).getBoundingClientRect().top)
}

// ---------- Execução ----------

const preview = args.url ? null : await startPreview()
const url = args.url ?? preview.url
const cdp = await launchChrome()
mkdirSync(OUT, { recursive: true })
const failures = []
let shots = 0

async function scrollTo(y) {
  await cdp.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
  await cdp.evaluate(settle, 3)
}

async function record(ctx, problems) {
  if (!problems.length) return
  for (const p of problems) failures.push(`${ctx}: ${p}`)
  if (shots >= MAX_FAIL_SHOTS) return
  const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 70 })
  writeFileSync(path.join(OUT, `falha-${++shots}.jpg`), Buffer.from(shot.data, 'base64'))
  failures.push(`   ↳ print: ${path.join(args.out, `falha-${shots}.jpg`)}`)
}

async function load(width, height, reduced, hash = '') {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 761 })
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }],
  })
  // Query única a cada carga: só trocar o #hash na mesma URL não recarregaria a página
  await cdp.send('Page.navigate', { url: `${url}?carga=${++loads}${hash}` })
  await sleep(1200)
  const scene = await cdp.evaluate(waitScene)
  if (REQUIRE_SCENE && !scene) failures.push(`${width}x${height}${reduced ? ' (movimento reduzido)' : ''}: cena 3D não carregou (headless sem GPU? rode com --no-scene)`)
  if (hash) return
  // Carrega todas as fotos lazy: o print sai completo e nenhuma medida depende de imagem chegando
  await cdp.evaluate(() => Promise.all([...document.images].map((i) => ((i.loading = 'eager'), i.decode().catch(() => {})))))
  await cdp.evaluate(settle, 5)
}

const mouseStates = (w, h) =>
  w >= DESKTOP
    ? [
        ['mouse no centro', w / 2, h / 2],
        ['mouse no canto superior esquerdo', 0, 0],
        ['mouse no canto inferior direito', w - 1, h - 1],
      ]
    : [['toque', null, null]]

await cdp.send('Page.enable')
let checked = 0
let loads = 0
for (const [w, h] of VIEWPORTS) {
  const vp = `${w}x${h}`
  // ----- Com movimento -----
  await load(w, h, false)
  await record(`${vp} topo`, await cdp.evaluate(motionState))
  const full = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 70, captureBeyondViewport: true })
  writeFileSync(path.join(OUT, `pagina-${vp}.jpg`), Buffer.from(full.data, 'base64'))

  const positions = await cdp.evaluate(scrollPositions)
  for (const [mouseLabel, mx, my] of mouseStates(w, h)) {
    if (mx !== null) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mx, y: my })
      await sleep(1300) // o motor suaviza o mouse em ~1s
    }
    for (const [label, y] of positions) {
      await scrollTo(y)
      await record(`${vp}, y=${y} (${label}), ${mouseLabel}`, await cdp.evaluate(measure))
      checked++
    }
  }

  // ----- Link direto com #destino -----
  for (const id of HASH_TARGETS) {
    await load(w, h, false, `#${id}`)
    await sleep(1500) // fontes, vitrine fixada e cena 3D já mudaram a página
    await cdp.evaluate(settle, 3)
    const top = await cdp.evaluate(hashTargetTop, id)
    await record(`${vp}, link direto #${id}`, Math.abs(top) > 2 ? [`destino a ${top}px do topo da tela`] : [])
    checked++
  }

  // ----- Movimento reduzido -----
  await load(w, h, true)
  for (const [label, y] of (await cdp.evaluate(scrollPositions)).filter(([l]) => l !== 'varredura')) {
    await scrollTo(y)
    const problems = [...(await cdp.evaluate(measure)), ...(await cdp.evaluate(staticState))]
    await record(`${vp}, y=${y} (${label}), movimento reduzido`, problems)
    checked++
  }
  console.log(`✓ ${vp} conferido`)
}

cdp.close()
await preview?.close()

if (failures.length) {
  console.error(`\n✗ ${failures.filter((f) => !f.startsWith('   ')).length} problema(s) em ${checked} quadros:\n${failures.join('\n')}`)
  process.exit(1)
}
console.log(`\n✓ Nenhum problema em ${checked} quadros (${VIEWPORTS.map((v) => v.join('x')).join(', ')}; com e sem movimento, cena 3D ${REQUIRE_SCENE ? 'ligada' : 'opcional'}). Prints em ${args.out}/`)
process.exit(0)
