import { finale } from '../../data/content'
import { GlassButton } from '../glass/GlassButton'

/** Seção alta e quase vazia: é onde as pérolas formam o colar (Fase 4). */
export function Finale() {
  return (
    <section aria-label={finale.label} className="flex min-h-[92vh] items-center justify-center text-center">
      <div className="wrap flex flex-col items-center gap-[26px]">
        <h2 className="text-[clamp(48px,7.5vw,112px)] leading-none">{finale.title}</h2>
        <p className="max-w-[26em] text-ink-soft">{finale.text}</p>
        <GlassButton href={finale.cta.href} variant="dark">
          {finale.cta.label}
        </GlassButton>
      </div>
    </section>
  )
}
