import { steps } from '../../data/content'
import { SectionHead } from './SectionHead'

export function Steps() {
  return (
    <section className="py-[120px]">
      <div className="wrap">
        <SectionHead title={steps.title} />
        <div className="steps-line" aria-hidden="true">
          <i data-line />
        </div>
        {/* Lista ordenada: é uma sequência real (1 → 2 → 3) */}
        <ol className="flex flex-wrap">
          {steps.items.map((s, i) => (
            <li key={s.title} className="flex flex-[1_1_260px] flex-col gap-2.5 pt-[30px] pr-7">
              <span className="font-display text-[52px] leading-none text-accent" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="font-body text-xl font-medium tracking-normal">{s.title}</h3>
              <p className="max-w-[22em] text-ink-soft">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
