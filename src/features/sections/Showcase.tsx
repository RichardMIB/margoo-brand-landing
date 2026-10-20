import { anchors, showcase } from '../../data/content'
import { FloatPhoto } from '../media/FloatPhoto'

/**
 * "Na vitrine agora". Por padrão é um carrossel de arrastar (celular, sem JS, movimento reduzido).
 * A partir de 761px o motor de scroll liga o modo fixado (.is-pinned): o scroll vertical move o trilho.
 */
export function Showcase() {
  return (
    <section id={anchors.showcase} aria-label={showcase.label} className="rail" data-rail>
      <div className="rail-sticky">
        {/* w-full: em flex coluna, margin auto do .wrap impediria o cabeçalho de esticar */}
        <div className="wrap flex w-full flex-wrap items-end justify-between gap-5">
          <h2 data-slide className="text-[clamp(38px,4.6vw,66px)] leading-[1.04]">
            {showcase.title}
          </h2>
          <p className="max-w-[24em] text-ink-soft">{showcase.lead}</p>
        </div>
        <div className="rail-track" data-rail-track>
          {showcase.items.map((item) => (
            <a key={item.label} href={item.href} className="rail-item">
              <FloatPhoto photo={item.photo} sizes="(min-width: 761px) 340px, 70vw" />
              <span className="text-base">{item.label}</span>
            </a>
          ))}
        </div>
        <div className="rail-progress" aria-hidden="true">
          <i data-rail-bar />
        </div>
      </div>
    </section>
  )
}
