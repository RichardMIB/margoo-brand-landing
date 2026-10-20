interface SectionHeadProps {
  title: string
  lead?: string
}

/** Cabeçalho de seção: título à esquerda (desliza no scroll) e texto de apoio à direita. */
export function SectionHead({ title, lead }: SectionHeadProps) {
  return (
    <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
      <h2 data-slide className="max-w-[11em] text-[clamp(38px,4.6vw,66px)] leading-[1.04]">
        {title}
      </h2>
      {lead && <p className="max-w-[27em] text-ink-soft">{lead}</p>}
    </div>
  )
}
