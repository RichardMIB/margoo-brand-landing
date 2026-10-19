import { facts } from '../../data/content'

export function Facts() {
  return (
    <section aria-label={facts.label}>
      <ul className="wrap flex flex-wrap">
        {facts.items.map((f) => (
          <li key={f.title} className="flex flex-[1_1_240px] flex-col gap-1 py-[30px] pr-6">
            <strong className="font-display text-[26px] font-normal">{f.title}</strong>
            <span className="text-[15px] text-ink-soft">{f.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
