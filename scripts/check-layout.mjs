// Checagem de layout num Chrome real (headless), com o motor de scroll ligado.
//
// Regra do CLAUDE.md: nenhuma foto cobre título, legenda ou botão, em nenhuma posição do scroll.
// Para cada largura, rola a página por várias posições (início, meio e fim de cada seção com
// movimento + uma varredura a cada meia tela), com o mouse no centro e nos cantos, e mede:
//   - foto x texto: interseção dos retângulos (texto medido pelas linhas reais, via Range);
//   - vazamento lateral: algo além da borda da tela ou rolagem horizontal;
//   - letreiro: as duas linhas sempre cobrindo da borda esquerda à direita.
// Depois repete com prefers-reduced-motion: reduce e confere que nada foi animado.
//
// Sem dependências: o Chrome instalado é controlado pelo protocolo de depuração (CDP) usando o
// WebSocket nativo do Node 22+, e o servidor é o `vite preview` pela API do próprio Vite.
//
// Uso:  npm run check:layout                       (gera o build e testa)
//       node scripts/check-layout.mjs --url http://localhost:5173 --widths 360,1440
// Saída: .layout-check/ (prints da página e das falhas). Código 1 se achar problema.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'

const { values: args } = parseArgs({
  options: {
    url: { type: 'string' },
    widths: { type: 'string', default: '360,768,1280,1440,1920' },
    height: { type: 'string', default: '900' },
    out: { type: 'string', default: '.layout-check' },
  },
})
const WIDTHS = args.widths.split(',').map(Number)
const VH = Number(args.height)
const OUT = path.resolve(args.out)
const DESKTOP = 901 // a partir daqui o mouse mexe nas fotos (ponteiro fino)
const MAX_FAIL_SHOTS = 12

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ]
  const found = candidates.find((p) => p && existsSync(p))
  if (!found) throw new Error('Chrome não encontrado. Defina CHROME_PATH com o caminho do executável.')
  return found
}

/** Sobe o `vite preview` com o dist/ atual, numa porta livre. */
async function startPreview() {
  if (!existsSync('dist/index.html')) throw new Error('dist/ não existe. Rode `npm run build` antes.')
  const { preview } = await import('vite')
  const server = await preview({ logLevel: 'silent', preview: { port: 4317, strictPort: false, open: false } })
  const url = server.resolvedUrls?.local[0]
  if (!url) throw new Error('vite preview não informou a URL.')
  return { url, close: () => new Promise((r) => server.httpServer.close(r)) }
}

/** Abre o Chrome headless e devolve um cliente CDP mínimo. */
async function launchChrome() {
  const profile = mkdtempSync(path.join(tmpdir(), 'margoo-check-'))
  const port = 9300 + Math.floor(Math.random() * 600)
  const proc = spawn(
    findChrome(),
    ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--hide-scrollbars', `--user-data-dir=${profile}`, 'about:blank'],
    { stdio: 'ignore' },
  )
  let target
  for (let i = 0; i < 60 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      target = list.find((t) => t.type === 'page')
    } catch {
      await sleep(200)
    }
  }
  if (!target) throw new Error('O Chrome não abriu a porta de depuração.')

  const sock = new globalThis.WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    sock.addEventListener('open', resolve)
    sock.addEventListener('error', reject)
  })
  let seq = 0
  const pending = new Map()
  sock.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    if (!msg.id || !pending.has(msg.id)) return
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) reject(new Error(msg.error.message))
    else resolve(msg.result)
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq
      pending.set(id, { resolve, reject })
      sock.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = async (fn, ...fnArgs) => {
    const expression = `(${fn})(...${JSON.stringify(fnArgs)})`
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result.value
  }
  const close = () => {
    sock.close()
    proc.kill()
    try {
      rmSync(profile, { recursive: true, force: true })
    } catch {
      /* o Chrome pode segurar o perfil por alguns ms no Windows; é pasta temporária */
    }
  }
  return { send, evaluate, close }
}

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

async function load(width, reduced) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: VH, deviceScaleFactor: 1, mobile: width < 761 })
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }],
  })
  await cdp.send('Page.navigate', { url })
  await sleep(1200)
  // Carrega todas as fotos lazy: o print sai completo e nenhuma medida depende de imagem chegando
  await cdp.evaluate(() => Promise.all([...document.images].map((i) => ((i.loading = 'eager'), i.decode().catch(() => {})))))
  await cdp.evaluate(settle, 5)
}

const mouseStates = (w) =>
  w >= DESKTOP
    ? [
        ['mouse no centro', w / 2, VH / 2],
        ['mouse no canto superior esquerdo', 0, 0],
        ['mouse no canto inferior direito', w - 1, VH - 1],
      ]
    : [['toque', null, null]]

await cdp.send('Page.enable')
let checked = 0
for (const w of WIDTHS) {
  // ----- Com movimento -----
  await load(w, false)
  await record(`${w}px topo`, await cdp.evaluate(motionState))
  const full = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 70, captureBeyondViewport: true })
  writeFileSync(path.join(OUT, `pagina-${w}.jpg`), Buffer.from(full.data, 'base64'))

  const positions = await cdp.evaluate(scrollPositions)
  for (const [mouseLabel, mx, my] of mouseStates(w)) {
    if (mx !== null) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mx, y: my })
      await sleep(1300) // o motor suaviza o mouse em ~1s
    }
    for (const [label, y] of positions) {
      await scrollTo(y)
      await record(`${w}px, y=${y} (${label}), ${mouseLabel}`, await cdp.evaluate(measure))
      checked++
    }
  }

  // ----- Movimento reduzido -----
  await load(w, true)
  for (const [label, y] of (await cdp.evaluate(scrollPositions)).filter(([l]) => l !== 'varredura')) {
    await scrollTo(y)
    const problems = [...(await cdp.evaluate(measure)), ...(await cdp.evaluate(staticState))]
    await record(`${w}px, y=${y} (${label}), movimento reduzido`, problems)
    checked++
  }
  console.log(`✓ ${w}px conferido`)
}

cdp.close()
await preview?.close()

if (failures.length) {
  console.error(`\n✗ ${failures.filter((f) => !f.startsWith('   ')).length} problema(s) em ${checked} quadros:\n${failures.join('\n')}`)
  process.exit(1)
}
console.log(`\n✓ Nenhum problema em ${checked} quadros (${WIDTHS.join(', ')}px; com e sem movimento). Prints em ${args.out}/`)
process.exit(0)
