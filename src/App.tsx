import { a11y } from './data/content'
import { Contact } from './features/sections/Contact'
import { Facts } from './features/sections/Facts'
import { Finale } from './features/sections/Finale'
import { Footer } from './features/sections/Footer'
import { Header } from './features/sections/Header'
import { Hero } from './features/sections/Hero'
import { Marquee } from './features/sections/Marquee'
import { Occasions } from './features/sections/Occasions'
import { Showcase } from './features/sections/Showcase'
import { Steps } from './features/sections/Steps'
import { Store } from './features/sections/Store'

export default function App() {
  return (
    // Camada do conteúdo (z-index 1): na Fase 4 a cena 3D fica fixa atrás, em z-index 0
    <div className="relative z-[1]">
      <a
        href={`#${a11y.mainId}`}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-10 focus:rounded-full focus:bg-pearl focus:px-5 focus:py-3"
      >
        {a11y.skipLink}
      </a>
      <Header />
      <main id={a11y.mainId}>
        <Hero />
        <Marquee />
        <Facts />
        <Occasions />
        <Showcase />
        <Steps />
        <Store />
        <Contact />
        <Finale />
      </main>
      <Footer />
    </div>
  )
}
