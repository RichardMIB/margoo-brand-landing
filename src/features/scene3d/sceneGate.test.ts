import { describe, expect, it } from 'vitest'
import { decideScene, type DeviceSignals } from './sceneGate'

/** Notebook bom: tudo favorável. */
const strong: DeviceSignals = {
  width: 1440,
  finePointer: true,
  reducedMotion: false,
  saveData: false,
  deviceMemory: 8,
  hardwareConcurrency: 8,
  hardwareWebGL: true,
}

/** Tablet bom: tela larga, toque, aparelho forte. */
const tablet: DeviceSignals = { ...strong, width: 1024, finePointer: false }

describe('decideScene: computador (tela larga + mouse/touchpad)', () => {
  it('carrega o 3D ao vivo', () => {
    expect(decideScene(strong)).toEqual({ mode: 'live' })
  })

  it('761px já é tela larga', () => {
    expect(decideScene({ ...strong, width: 761 }).mode).toBe('live')
  })

  it('notebook de 4 núcleos e 4 GB carrega o 3D (núcleos e memória só valem no toque)', () => {
    expect(decideScene({ ...strong, hardwareConcurrency: 4, deviceMemory: 4 })).toEqual({ mode: 'live' })
    expect(decideScene({ ...strong, hardwareConcurrency: 2, deviceMemory: 2 })).toEqual({ mode: 'live' })
  })

  it.each([
    [{ saveData: true }, 'economia-de-dados'],
    [{ reducedMotion: true }, 'movimento-reduzido'],
    [{ hardwareWebGL: false }, 'sem-webgl'],
  ] as const)('%o → estático (%s)', (change, reason) => {
    expect(decideScene({ ...strong, ...change })).toEqual({ mode: 'static', reason })
  })

  it('sinal ausente (Safari e Firefox não têm deviceMemory nem saveData) não conta contra', () => {
    expect(decideScene({ ...strong, saveData: undefined, deviceMemory: undefined }).mode).toBe('live')
    expect(decideScene({ ...strong, hardwareConcurrency: undefined }).mode).toBe('live')
  })
})

describe('decideScene: celular (≤ 760px)', () => {
  it.each([760, 390, 360])('%ipx → estático, mesmo com mouse e aparelho forte', (width) => {
    expect(decideScene({ ...strong, width })).toEqual({ mode: 'static', reason: 'tela-estreita' })
  })

  it('celular com tudo ruim informa o primeiro motivo (tela)', () => {
    const phone: DeviceSignals = {
      width: 390,
      finePointer: false,
      reducedMotion: true,
      saveData: true,
      deviceMemory: 2,
      hardwareConcurrency: 4,
      hardwareWebGL: false,
    }
    expect(decideScene(phone)).toEqual({ mode: 'static', reason: 'tela-estreita' })
  })
})

describe('decideScene: tablet (tela larga + toque)', () => {
  it('forte carrega o 3D ao vivo', () => {
    expect(decideScene(tablet)).toEqual({ mode: 'live' })
  })

  it.each([
    [{ deviceMemory: 4 }, 'pouca-memoria'],
    [{ deviceMemory: 2 }, 'pouca-memoria'],
    [{ hardwareConcurrency: 4 }, 'poucos-nucleos'],
    [{ hardwareConcurrency: 2 }, 'poucos-nucleos'],
    [{ saveData: true }, 'economia-de-dados'],
    [{ reducedMotion: true }, 'movimento-reduzido'],
    [{ hardwareWebGL: false }, 'sem-webgl'],
  ] as const)('%o → estático (%s)', (change, reason) => {
    expect(decideScene({ ...tablet, ...change })).toEqual({ mode: 'static', reason })
  })

  it('limites são "igual ou abaixo": 5 núcleos e 8 GB passam', () => {
    expect(decideScene({ ...tablet, hardwareConcurrency: 5, deviceMemory: 8 }).mode).toBe('live')
  })
})
