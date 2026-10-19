import { useEffect, useRef } from 'react'
import { glassPointerVars, TILT_VARS, type GlassStrength } from './glassPointer'

/**
 * Liga o efeito de vidro a um elemento: a luz segue o cursor e, com ponteiro fino e sem
 * movimento reduzido, o elemento inclina em 3D e é levemente atraído pelo cursor.
 * Escreve só variáveis CSS (sem re-render do React a cada movimento do mouse).
 */
export function useGlassPointer<T extends HTMLElement>(strength: GlassStrength = 'button') {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fine = window.matchMedia('(pointer: fine)')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      const vars = glassPointerVars(
        (e.clientX - r.left) / r.width,
        (e.clientY - r.top) / r.height,
        strength,
        fine.matches && !reduce.matches,
      )
      for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v)
    }
    const onLeave = () => {
      for (const k of TILT_VARS) el.style.removeProperty(k)
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [strength])

  return ref
}
