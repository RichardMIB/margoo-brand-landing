import { describe, expect, it } from 'vitest'
import { decideScene, type DeviceSignals } from './sceneGate'

/** Notebook bom: tudo favorável. */
const strong: DeviceSignals = {
  width: 1440,
  reducedMotion: false,
  saveData: false,
  deviceMemory: 8,
  hardwareConcurrency: 8,
  hardwareWebGL: true,
}

describe('decideScene', () => {
  it('desktop forte carrega o 3D ao vivo', () => {
    expect(decideScene(strong)).toEqual({ mode: 'live' })
  })

  it.each([
    [{ width: 760 }, 'tela-estreita'],
    [{ width: 360 }, 'tela-estreita'],
    [{ saveData: true }, 'economia-de-dados'],
    [{ deviceMemory: 4 }, 'pouca-memoria'],
    [{ deviceMemory: 2 }, 'pouca-memoria'],
    [{ hardwareConcurrency: 4 }, 'poucos-nucleos'],
    [{ hardwareConcurrency: 2 }, 'poucos-nucleos'],
    [{ reducedMotion: true }, 'movimento-reduzido'],
    [{ hardwareWebGL: false }, 'sem-webgl'],
  ] as const)('%o → estático (%s)', (change, reason) => {
    expect(decideScene({ ...strong, ...change })).toEqual({ mode: 'static', reason })
  })

  it('761px já é tela larga', () => {
    expect(decideScene({ ...strong, width: 761 }).mode).toBe('live')
  })

  it('limites são "igual ou abaixo": 5 núcleos e 8 GB passam', () => {
    expect(decideScene({ ...strong, hardwareConcurrency: 5, deviceMemory: 8 }).mode).toBe('live')
  })

  it('sinal ausente (Safari e Firefox não têm deviceMemory nem saveData) não conta contra', () => {
    expect(decideScene({ ...strong, saveData: undefined, deviceMemory: undefined }).mode).toBe('live')
    expect(decideScene({ ...strong, hardwareConcurrency: undefined }).mode).toBe('live')
  })

  it('celular com tudo ruim informa o primeiro motivo (tela)', () => {
    const phone: DeviceSignals = {
      width: 390,
      reducedMotion: true,
      saveData: true,
      deviceMemory: 2,
      hardwareConcurrency: 4,
      hardwareWebGL: false,
    }
    expect(decideScene(phone)).toEqual({ mode: 'static', reason: 'tela-estreita' })
  })
})
