import { anchors, business, storeSection } from '../../data/content'
import { GlassButton } from '../glass/GlassButton'
import { FloatPhoto } from '../media/FloatPhoto'

export function Store() {
  return (
    <section id={anchors.store} className="py-[120px]">
      <div className="wrap grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-[72px]">
        <FloatPhoto
          photo={storeSection.photo}
          className="h-[440px] lg:h-[600px]"
          sizes="(min-width: 901px) 600px, 100vw"
          data={{ 'data-reveal': '' }}
        />
        <div className="flex flex-col gap-[22px]">
          <h2 data-slide className="text-[clamp(38px,4.4vw,60px)] leading-[1.04]">
            {storeSection.title}
          </h2>
          <p className="max-w-[30em] text-ink-soft">{storeSection.lead}</p>
          <address className="text-lg leading-[1.7] not-italic">
            {storeSection.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <p className="text-ink-soft">
            {business.hours.map((h) => (
              <span key={h.label} className="block">
                {h.label}
              </span>
            ))}
          </p>
          <div className="flex flex-wrap gap-3.5">
            <GlassButton href={storeSection.primary.href} variant="dark">
              {storeSection.primary.label}
            </GlassButton>
            <GlassButton href={storeSection.secondary.href}>{storeSection.secondary.label}</GlassButton>
          </div>
        </div>
      </div>
    </section>
  )
}
