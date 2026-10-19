import { marquee } from '../../data/content'

/** Quantas vezes a lista se repete: sobra de texto para o deslocamento do scroll (Fase 3) em telas largas. */
const REPEAT = 3
const repeat = (words: string[]) => Array.from({ length: REPEAT }, () => words).flat()

export function Marquee() {
  return (
    <section aria-label={marquee.label} className="overflow-hidden border-y border-line py-7">
      {/* Leitores de tela ouvem a lista uma vez; as linhas repetidas são decorativas */}
      <p className="sr-only">{[...marquee.primary, ...marquee.outline].join(', ')}</p>
      <div className="marquee-row" data-marquee="-1" aria-hidden="true">
        {repeat(marquee.primary).map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className="marquee-row marquee-row--outline" data-marquee="1" aria-hidden="true">
        {repeat(marquee.outline).map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
    </section>
  )
}
