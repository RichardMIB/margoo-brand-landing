import type { FrameClient, FrameState } from './scrollEngine'
import {
  depthOffset,
  heroDrift,
  inView,
  innerParallax,
  lineScale,
  marqueeX,
  railProgress,
  revealClip,
  slideX,
} from './effects'

/** Larguras em que os efeitos mudam (iguais aos breakpoints do @theme). */
const PIN_MIN_WIDTH = 761 // abaixo disso a vitrine fica em carrossel
const DRIFT_MIN_WIDTH = 901 // abaixo disso o hero é uma coluna e o texto desceria sobre as fotos

const px = (n: number) => `${n.toFixed(2)}px`

/**
 * Efeitos de scroll do protótipo aplicados ao DOM, guiados pelos atributos data-* da marcação.
 * Cada quadro: 1) mede tudo, 2) escreve tudo. Ler depois de escrever forçaria layout no meio do quadro.
 * Com `still` (movimento reduzido) devolve a página ao estado estático, que já é completo sem JS.
 */
export function createDomEffects(root: ParentNode = document): FrameClient {
  const all = <T extends Element = HTMLElement>(sel: string) => [...root.querySelectorAll<T & HTMLElement>(sel)]

  // data-depth-from: largura mínima para o efeito (ex.: cartões que se encostam na grade de celular)
  const depths = all('[data-depth]').map((el) => ({
    el,
    depth: Number(el.dataset.depth) || 0,
    from: Number(el.dataset.depthFrom) || 0,
    y: 0,
  }))
  const inner = all<HTMLImageElement>('.float img')
  const marquees = all('[data-marquee]').map((el) => ({ el, dir: Number(el.dataset.marquee) || -1 }))
  const slides = all('[data-slide]')
  const drift = root.querySelector<HTMLElement>('[data-drift]')
  const line = root.querySelector<HTMLElement>('[data-line]')
  const reveal = root.querySelector<HTMLElement>('[data-reveal]')
  const rail = root.querySelector<HTMLElement>('[data-rail]')
  const track = rail?.querySelector<HTMLElement>('[data-rail-track]') ?? null
  const bar = rail?.querySelector<HTMLElement>('[data-rail-bar]') ?? null

  const touched = new Set<HTMLElement>()
  const written = new Map<HTMLElement, string>()
  /** Escreve só quando o valor muda: evita invalidar estilo à toa. */
  const set = (el: HTMLElement, prop: 'transform' | 'clipPath', value: string) => {
    const key = `${prop}:${value}`
    if (written.get(el) === key) return
    written.set(el, key)
    el.style[prop] = value
    touched.add(el)
  }

  /**
   * Link direto (/#loja): o HTML chega vazio (SPA), então o navegador procura o destino antes de
   * ele existir e desiste, deixando a página no topo. Depois, a vitrine fixada (+200vh) e as fontes
   * mudam as alturas. Enquanto a pessoa não rolar por conta própria, o destino é reposicionado na
   * montagem, quando as fontes chegam e a cada troca do modo da vitrine.
   */
  let userMoved = false
  let disposed = false
  const intents = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
  const onIntent = () => {
    userMoved = true
    for (const ev of intents) window.removeEventListener(ev, onIntent)
  }
  for (const ev of intents) window.addEventListener(ev, onIntent, { passive: true })
  const followHash = () => {
    if (userMoved || disposed) return
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
  followHash()
  void document.fonts?.ready.then(followHash)

  let isStill = true // começa "estático" (estado do HTML); o primeiro quadro animado liga os efeitos
  let pinned = false

  const setPinned = (on: boolean) => {
    if (!rail || on === pinned) return
    pinned = on
    rail.classList.toggle('is-pinned', on)
    if (!on && track) {
      track.style.transform = ''
      written.delete(track)
    }
    followHash()
  }

  /** Teclado na vitrine fixada: Tab até um item fora da tela rola a página até ele aparecer. */
  const onFocusIn = (e: FocusEvent) => {
    if (!pinned || !rail || !track) return
    const item = (e.target as HTMLElement).closest<HTMLElement>('a')
    if (!item || !track.contains(item)) return
    const sticky = track.parentElement
    if (sticky) sticky.scrollLeft = 0 // o navegador pode ter rolado o contêiner overflow:hidden
    const dist = track.scrollWidth - track.clientWidth
    if (dist <= 0) return
    const left = item.getBoundingClientRect().left - track.getBoundingClientRect().left
    const p = Math.min(Math.max((left - parseFloat(getComputedStyle(track).paddingLeft)) / dist, 0), 1)
    const railTop = rail.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: railTop + p * (rail.offsetHeight - window.innerHeight), behavior: 'instant' })
  }
  rail?.addEventListener('focusin', onFocusIn)

  const reset = () => {
    for (const el of touched) {
      el.style.transform = ''
      el.style.clipPath = ''
    }
    touched.clear()
    for (const d of depths) d.y = 0
    written.clear()
    setPinned(false)
    isStill = true
  }

  const frame = (s: FrameState) => {
    if (s.still) {
      if (!isStill) reset()
      return
    }
    isStill = false
    const { vh, vw } = s
    // A vitrine fixada muda a altura da página: alterna antes de medir.
    setPinned(vw >= PIN_MIN_WIDTH)

    // ---------- 1) Medir ----------
    const depthRects = depths.map((d) => d.el.getBoundingClientRect())
    const innerRects = inner.map((img) => img.parentElement!.getBoundingClientRect())
    const marqueeRects = marquees.map((m) => m.el.getBoundingClientRect())
    const marqueeWidths = marquees.map((m) => m.el.scrollWidth)
    const slideRects = slides.map((h) => h.getBoundingClientRect())
    const lineTop = line?.getBoundingClientRect().top
    const revealTop = reveal?.getBoundingClientRect().top
    const railRect = pinned ? rail!.getBoundingClientRect() : null
    const railDist = pinned && track ? Math.max(track.scrollWidth - track.clientWidth, 0) : 0

    // ---------- 2) Escrever ----------
    depths.forEach((d, i) => {
      const r = depthRects[i]
      if (vw < d.from) {
        d.y = 0
        set(d.el, 'transform', '')
        return
      }
      const top = r.top - d.y // posição sem o deslocamento já aplicado (sem realimentação)
      if (!inView(top, top + r.height, vh)) return
      const o = depthOffset(top + r.height / 2, vh, d.depth, s.mouseX, s.mouseY)
      d.y = o.y
      set(d.el, 'transform', `translate3d(${px(o.x)}, ${px(o.y)}, 0)`)
    })

    inner.forEach((img, i) => {
      const r = innerRects[i]
      if (!inView(r.top, r.bottom, vh)) return
      set(img, 'transform', `translate3d(0, ${innerParallax(r.top + r.height / 2, vh).toFixed(2)}%, 0)`)
    })

    if (drift) set(drift, 'transform', `translate3d(0, ${px(vw >= DRIFT_MIN_WIDTH ? heroDrift(s.scrollY) : 0)}, 0)`)

    marquees.forEach((m, i) => {
      const r = marqueeRects[i]
      if (!inView(r.top, r.bottom, vh)) return
      set(m.el, 'transform', `translate3d(${px(marqueeX(r.top, r.height, vh, vw, marqueeWidths[i], m.dir))}, 0, 0)`)
    })

    slides.forEach((h, i) => {
      const r = slideRects[i]
      if (!inView(r.top, r.bottom, vh)) return
      set(h, 'transform', `translate3d(${px(slideX(r.top, vh, vw))}, 0, 0)`)
    })

    if (line && lineTop !== undefined) set(line, 'transform', `scaleX(${lineScale(lineTop, vh).toFixed(4)})`)
    if (reveal && revealTop !== undefined) set(reveal, 'clipPath', revealClip(revealTop, vh))

    if (railRect && track) {
      const p = railProgress(railRect.top, railRect.height, vh)
      set(track, 'transform', `translate3d(${px(-p * railDist)}, 0, 0)`)
      if (bar) set(bar, 'transform', `scaleX(${p.toFixed(4)})`)
    }
  }

  return {
    frame,
    dispose() {
      disposed = true
      onIntent()
      rail?.removeEventListener('focusin', onFocusIn)
      reset()
    },
  }
}
