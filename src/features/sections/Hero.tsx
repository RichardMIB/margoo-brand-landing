import { anchors, hero } from '../../data/content'
import { GlassButton } from '../glass/GlassButton'
import { FloatPhoto } from '../media/FloatPhoto'

export function Hero() {
  const { main, second, third } = hero.photos
  return (
    <section id={anchors.top} className="pt-2 pb-[110px]">
      <div className="wrap grid grid-cols-1 items-center gap-10 lg:min-h-[680px] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div data-drift className="flex max-w-[580px] flex-col gap-[30px]">
          <p className="text-[15px] text-ink-soft">{hero.kicker}</p>
          <h1 className="text-[clamp(46px,6.4vw,94px)] leading-none">{hero.title}</h1>
          <p className="max-w-[31em] text-[19px] text-ink-soft">{hero.lead}</p>
          <div className="flex flex-wrap gap-3.5">
            <GlassButton href={hero.primary.href} variant="dark">
              {hero.primary.label}
            </GlassButton>
            <GlassButton href={hero.secondary.href}>{hero.secondary.label}</GlassButton>
          </div>
        </div>

        <div role="group" aria-label={hero.collageLabel} className="relative h-[540px] lg:h-[680px]">
          <FloatPhoto
            photo={main}
            caption={main.caption}
            captionSide="right" // a foto do corset cobre o canto esquerdo da principal
            depth={0.5}
            priority
            className="absolute top-0 right-[6%] h-[88%] w-[58%]"
            sizes="(min-width: 901px) 330px, 58vw"
          />
          <FloatPhoto
            photo={second}
            depth={1.2}
            className="absolute top-[10%] left-0 h-[42%] w-[34%]"
            sizes="(min-width: 901px) 190px, 34vw"
          />
          <FloatPhoto
            photo={third}
            depth={0.85}
            className="absolute bottom-0 left-[9%] h-[38%] w-[31%]"
            sizes="(min-width: 901px) 180px, 31vw"
          />
        </div>
      </div>
    </section>
  )
}
