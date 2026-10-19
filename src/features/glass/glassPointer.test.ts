import { describe, expect, it } from 'vitest'
import { glassPointerVars } from './glassPointer'

describe('glassPointerVars', () => {
  it('no centro, a luz fica no meio e não há inclinação', () => {
    expect(glassPointerVars(0.5, 0.5, 'button', true)).toEqual({
      '--mx': '50.0%',
      '--my': '50.0%',
      '--rx': '0.00deg',
      '--ry': '0.00deg',
      '--tx': '0.0px',
      '--ty': '0.0px',
    })
  })

  it('no canto superior esquerdo, inclina para o cursor', () => {
    const v = glassPointerVars(0, 0, 'button', true)
    expect(v['--rx']).toBe('8.00deg')
    expect(v['--ry']).toBe('-7.00deg')
    expect(v['--tx']).toBe('-4.0px')
  })

  it('cartão inclina menos que botão', () => {
    const b = parseFloat(glassPointerVars(1, 0, 'button', true)['--ry'])
    const c = parseFloat(glassPointerVars(1, 0, 'card', true)['--ry'])
    expect(c).toBeLessThan(b)
  })

  it('sem tilt (toque ou movimento reduzido) só move a luz', () => {
    expect(Object.keys(glassPointerVars(0.2, 0.8, 'card', false))).toEqual(['--mx', '--my'])
  })
})
