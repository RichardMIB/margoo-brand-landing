import { useEffect } from 'react'
import { createDomEffects } from './domEffects'
import { scrollEngine } from './scrollEngine'

/**
 * Liga o motor de scroll depois que a página montou e registra os efeitos do DOM.
 * A cena 3D (Fase 4) se registra sozinha com `scrollEngine.add` quando o lazy carregar.
 */
export function useScrollEngine() {
  useEffect(() => {
    const removeDom = scrollEngine.add(createDomEffects(document))
    scrollEngine.start()
    return () => {
      removeDom()
      scrollEngine.stop()
    }
  }, [])
}
