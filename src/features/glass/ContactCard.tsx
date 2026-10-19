import { useGlassPointer } from './useGlassPointer'

interface ContactCardProps {
  name: string
  /** Ex.: "Consultora, WhatsApp [NÚMERO]". */
  detail: string
  href: string
  ctaLabel: string
  external?: boolean
}

/** Cartão de vidro de uma consultora. O cartão inteiro é o link; o "botão" fumê é visual. */
export function ContactCard({ name, detail, href, ctaLabel, external = false }: ContactCardProps) {
  const ref = useGlassPointer<HTMLAnchorElement>('card')

  return (
    <a
      ref={ref}
      href={href}
      className="glass-card"
      {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
    >
      <span>
        <strong className="block font-display text-[28px] leading-[1.1] font-normal">{name}</strong>
        <small className="text-sm text-ink-soft">{detail}</small>
      </span>
      <span className="glass-card__cta">
        <WhatsAppIcon />
        {ctaLabel}
      </span>
    </a>
  )
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20l1.2-4.4A8.4 8.4 0 1 1 20 11.5z" />
    </svg>
  )
}
