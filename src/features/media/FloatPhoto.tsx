import type { CSSProperties } from 'react'
import type { Photo } from '../../data/content'
import images from '../../data/images.generated.json'
import { photoSources } from './photoSources'

interface FloatPhotoProps {
  photo: Photo
  /** Atributo `sizes` do <img>: largura que a foto ocupa na tela em cada faixa. */
  sizes: string
  className?: string
  /** Legenda em pílula pérola no canto (ex.: "Vestido assimétrico"). */
  caption?: string
  /** Canto da legenda. Use "right" quando outra foto se sobrepõe ao canto esquerdo. */
  captionSide?: 'left' | 'right'
  /** Profundidade do parallax (mouse + scroll). Lido pelo motor de scroll na Fase 3. */
  depth?: number
  /** Primeira dobra: carrega já e com prioridade alta (LCP). Fora dela: lazy. */
  priority?: boolean
  /** Atributos extras para o motor de scroll (ex.: data-reveal). */
  data?: Record<`data-${string}`, string>
  style?: CSSProperties
}

/**
 * Foto que "flutua" sobre o fundo: moldura com sombra longa e raio de 3px.
 * A imagem tem 116% da altura da moldura para deslizar dentro dela (parallax interno, Fase 3).
 * A moldura precisa de altura definida (altura explícita ou aspect-ratio) pela classe recebida.
 */
export function FloatPhoto({
  photo,
  sizes,
  className = '',
  caption,
  captionSide = 'left',
  depth,
  priority = false,
  data,
  style,
}: FloatPhotoProps) {
  const src = photoSources(images[photo.id])

  return (
    <figure
      className={`float ${className}`}
      data-depth={depth}
      style={style}
      {...data}
    >
      <img
        src={src.src}
        srcSet={src.srcSet}
        sizes={sizes}
        width={src.width}
        height={src.height}
        alt={photo.alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        style={photo.objectPosition ? { objectPosition: photo.objectPosition } : undefined}
      />
      {caption && <figcaption className={`float-tag float-tag--${captionSide}`}>{caption}</figcaption>}
    </figure>
  )
}
