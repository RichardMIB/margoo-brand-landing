import { business, hero } from './data/content'

// Fase 1: tela de conferência da base (tokens, fontes e conteúdo). As 11 seções entram na Fase 2.
const swatches = ['ground', 'ground-deep', 'ink', 'ink-soft', 'pearl', 'accent'] as const
const swatchClass: Record<(typeof swatches)[number], string> = {
  ground: 'bg-ground',
  'ground-deep': 'bg-ground-deep',
  ink: 'bg-ink',
  'ink-soft': 'bg-ink-soft',
  pearl: 'bg-pearl',
  accent: 'bg-accent',
}

export default function App() {
  return (
    <main className="wrap flex min-h-svh flex-col justify-center gap-10 py-16">
      <p className="text-base font-medium tracking-logo">{business.logo}</p>
      <h1 className="max-w-[12em] text-[clamp(46px,6.4vw,94px)] leading-none">{hero.title}</h1>
      <p className="max-w-[31em] text-[19px] text-ink-soft">{hero.lead}</p>
      <ul className="flex flex-wrap gap-4" aria-label="Tokens de cor">
        {swatches.map((name) => (
          <li key={name} className="flex flex-col gap-2 text-sm">
            <span className={`block size-16 rounded-photo border border-line ${swatchClass[name]}`} />
            {name}
          </li>
        ))}
      </ul>
    </main>
  )
}
