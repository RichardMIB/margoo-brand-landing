import { anchors, occasions } from '../../data/content'
import { FloatPhoto } from '../media/FloatPhoto'
import { SectionHead } from './SectionHead'

/** Profundidade do parallax de cada foto, na ordem dos itens (protótipo). */
const DEPTHS = [0.3, 0.8, 0.55, 1, 0.4]
/** Largura ocupada por cada foto no desktop (grade de 12 colunas em 1160px). */
const SIZES = [
  '(min-width: 901px) 470px, 100vw',
  '(min-width: 901px) 270px, 50vw',
  '(min-width: 901px) 270px, 50vw',
  '(min-width: 901px) 270px, 50vw',
  '(min-width: 901px) 370px, 50vw',
]

export function Occasions() {
  return (
    <section id={anchors.collections} className="py-[120px]">
      <div className="wrap">
        <SectionHead title={occasions.title} lead={occasions.lead} />
        <div className="occasions">
          {occasions.items.map((item, i) => (
            <a
              key={item.title}
              href={item.href}
              className={`occ occ-${i + 1} flex flex-col gap-3.5 no-underline`}
            >
              <FloatPhoto photo={item.photo} depth={DEPTHS[i]} sizes={SIZES[i]} />
              <h3 className="text-[30px]">{item.title}</h3>
              <p className="-mt-2 text-[15px] text-ink-soft">{item.text}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
