import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { useGlassPointer } from './useGlassPointer'

type GlassButtonProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'> & {
  href: string
  /** light = vidro claro; dark = vidro fumê grafite. */
  variant?: 'light' | 'dark'
  size?: 'md' | 'sm'
  /** Abre em nova aba (WhatsApp). */
  external?: boolean
  children: ReactNode
}

/** Botão de vidro. É sempre um link real (<a href>): navega, abre em nova aba e funciona sem JS. */
export function GlassButton({
  href,
  variant = 'light',
  size = 'md',
  external = false,
  className = '',
  children,
  ...rest
}: GlassButtonProps) {
  const ref = useGlassPointer<HTMLAnchorElement>('button')
  const classes = ['glass-btn', `glass-btn--${variant}`, size === 'sm' && 'glass-btn--sm', className]
    .filter(Boolean)
    .join(' ')

  return (
    <a
      ref={ref}
      href={href}
      className={classes}
      {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
      {...rest}
    >
      {children}
    </a>
  )
}
