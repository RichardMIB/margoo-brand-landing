import { useEffect, useRef, useState } from 'react'
import { MAX_STATIC_WIDTH } from './sceneGate'
import { whenPageIdle } from './webgl'

/**
 * Versão estática da cena (ADR 004): a fita no topo e o colar no fim, pré-renderizados da cena
 * real (npm run bake:posters). Desenhados em <canvas>, não em <img>: uma imagem decorativa do
 * tamanho da tela viraria o "maior elemento" e passaria a ser medida como LCP no lugar do título.
 * Entram depois do conteúdo (mesmo momento da cena ao vivo), com fade.
 */

type Shot = 'fita' | 'colar'

const posterUrl = (shot: Shot, narrow: boolean) =>
  `${import.meta.env.BASE_URL}posters/${shot}-${narrow ? 'mobile' : 'desktop'}.webp`

/** Desenha a imagem cobrindo o canvas (como object-fit: cover), na resolução da tela. */
function drawCover(canvas: HTMLCanvasElement, img: HTMLImageElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const { width, height } = canvas.getBoundingClientRect()
  if (!width || !height) return
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight)
  const w = img.naturalWidth * scale
  const h = img.naturalHeight * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
}

interface PosterProps {
  shot: Shot
  className: string
  /**
   * Só no celular: o pôster começa logo abaixo deste elemento (seletor CSS), em vez do topo.
   * Usado no H1 do hero: em 360px a ponta da fita cruzava a última linha do título.
   */
  belowOnNarrow?: string
}

/** Topo do pôster (px no documento): abaixo do elemento indicado, ou 0. */
function posterTop(selector: string | undefined): number {
  const el = selector ? document.querySelector(selector) : null
  return el ? el.getBoundingClientRect().bottom + window.scrollY : 0
}

function Poster({ shot, className, belowOnNarrow }: PosterProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    let img: HTMLImageElement | null = null
    let observer: ResizeObserver | null = null
    const cancelIdle = whenPageIdle(() => {
      const narrow = window.innerWidth <= MAX_STATIC_WIDTH
      const place = () => {
        if (belowOnNarrow) el.style.top = narrow ? `${posterTop(belowOnNarrow)}px` : ''
      }
      img = new Image()
      img.decoding = 'async'
      img.src = posterUrl(shot, narrow)
      img
        .decode()
        .then(() => {
          if (!img) return
          place()
          drawCover(el, img)
          setReady(true)
          // O corpo da página muda de altura com fontes e largura: reposiciona e redesenha
          observer = new ResizeObserver(() => {
            place()
            if (img) drawCover(el, img)
          })
          observer.observe(el)
          observer.observe(document.body)
        })
        .catch(() => {
          /* sem pôster: a página continua completa */
        })
    })
    return () => {
      cancelIdle()
      observer?.disconnect()
      img = null
    }
  }, [shot, belowOnNarrow])

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className={`scene-layer pointer-events-none absolute inset-x-0 h-svh w-full ${className}${ready ? ' is-ready' : ''}`}
    />
  )
}

/** Fita no primeiro quadro da página e colar no último, atrás do conteúdo. */
export function ScenePosters() {
  return (
    <>
      <Poster shot="fita" className="poster-fita top-0" belowOnNarrow="#topo h1" />
      <Poster shot="colar" className="bottom-0" />
    </>
  )
}
