// Chrome headless controlado pelo protocolo de depuração (CDP), sem dependências:
// WebSocket e fetch nativos do Node 22+. Usado por check-layout.mjs e bake-envmap.mjs.
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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
export async function startPreview() {
  if (!existsSync('dist/index.html')) throw new Error('dist/ não existe. Rode `npm run build` antes.')
  const { preview } = await import('vite')
  const server = await preview({ logLevel: 'silent', preview: { port: 4317, strictPort: false, open: false } })
  const url = server.resolvedUrls?.local[0]
  if (!url) throw new Error('vite preview não informou a URL.')
  return { url, close: () => new Promise((r) => server.httpServer.close(r)) }
}

/** Abre o Chrome headless e devolve um cliente CDP mínimo. */
export async function launchChrome() {
  const profile = mkdtempSync(path.join(tmpdir(), 'margoo-chrome-'))
  const port = 9300 + Math.floor(Math.random() * 600)
  const proc = spawn(
    findChrome(),
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--no-first-run',
      '--hide-scrollbars',
      // A cena 3D não carrega com WebGL por software (failIfMajorPerformanceCaveat): força a GPU
      '--enable-gpu',
      '--ignore-gpu-blocklist',
      ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []),
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
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
