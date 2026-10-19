import { a11y, anchors, business, header } from '../../data/content'
import { GlassButton } from '../glass/GlassButton'

export function Header() {
  return (
    <header>
      <div className="wrap flex items-center justify-between gap-3 py-[26px] sm:gap-5">
        <a href={`#${anchors.top}`} className="text-sm font-medium tracking-logo no-underline sm:text-base">
          {business.logo}
        </a>
        <nav aria-label={a11y.navLabel} className="hidden gap-[34px] text-[15px] nav:flex">
          {header.nav.map((l) => (
            <a key={l.href} href={l.href} className="no-underline underline-offset-[6px] hover:underline">
              {l.label}
            </a>
          ))}
        </nav>
        <GlassButton href={header.cta.href} size="sm" className="max-sm:px-4 max-sm:text-sm">
          {header.cta.label}
        </GlassButton>
      </div>
    </header>
  )
}
