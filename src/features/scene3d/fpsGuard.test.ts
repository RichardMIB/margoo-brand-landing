import { describe, expect, it } from 'vitest'
import { createFpsGuard, FPS_SAMPLE_MS, FPS_WARMUP_MS } from './fpsGuard'

/** Simula quadros a `fps` constante durante `ms`, a partir de `start`. Devolve o último instante. */
function run(guard: ReturnType<typeof createFpsGuard>, fps: number, ms: number, start = 0) {
  const step = 1000 / fps
  let t = start
  for (; t <= start + ms; t += step) guard.frame(t)
  return t - step
}

const ENOUGH = FPS_WARMUP_MS + FPS_SAMPLE_MS + 100

describe('createFpsGuard', () => {
  it('60 fps: cena fica', () => {
    const g = createFpsGuard()
    run(g, 60, ENOUGH)
    expect(g.verdict).toBe('ok')
    expect(g.fps).toBe(60)
  })

  it('25 fps: troca pelos pôsteres', () => {
    const g = createFpsGuard()
    run(g, 25, ENOUGH)
    expect(g.verdict).toBe('slow')
    expect(g.fps).toBe(25)
  })

  it('o corte é "abaixo de 40": 40 fica, 38 sai', () => {
    const ok = createFpsGuard()
    run(ok, 40, ENOUGH)
    expect(ok.verdict).toBe('ok')
    const slow = createFpsGuard()
    run(slow, 38, ENOUGH)
    expect(slow.verdict).toBe('slow')
  })

  it('continua medindo até completar aquecimento + amostra', () => {
    const g = createFpsGuard()
    run(g, 60, FPS_WARMUP_MS + FPS_SAMPLE_MS - 100)
    expect(g.verdict).toBe('measuring')
  })

  it('o aquecimento não entra na média: travada no primeiro segundo, depois 60 fps', () => {
    const g = createFpsGuard()
    const t = run(g, 5, FPS_WARMUP_MS - 50)
    run(g, 60, FPS_SAMPLE_MS + 300, t)
    expect(g.verdict).toBe('ok')
  })

  it('aba oculta: o tempo parado não conta', () => {
    const g = createFpsGuard()
    const t = run(g, 60, 2000)
    g.pause()
    // volta 30 s depois; sem pause, esse intervalo derrubaria a média
    run(g, 60, 3000, t + 30_000)
    expect(g.verdict).toBe('ok')
  })

  it('aparelho travando (1 quadro por segundo) também decide, não fica medindo para sempre', () => {
    const g = createFpsGuard()
    run(g, 1, ENOUGH + 1000)
    expect(g.verdict).toBe('slow')
  })

  it('decide uma vez só: depois de "slow", quadros rápidos não revertem', () => {
    const g = createFpsGuard()
    const t = run(g, 20, ENOUGH)
    expect(g.verdict).toBe('slow')
    expect(g.frame(t + 16)).toBe('slow')
    run(g, 60, 10_000, t)
    expect(g.verdict).toBe('slow')
  })

  it('decide uma vez só: depois de "ok", uma queda não troca a cena', () => {
    const g = createFpsGuard()
    const t = run(g, 60, ENOUGH)
    run(g, 10, 10_000, t)
    expect(g.verdict).toBe('ok')
  })

  it('relógio repetido ou voltando não quebra a conta', () => {
    const g = createFpsGuard()
    g.frame(100)
    g.frame(100)
    g.frame(50)
    expect(g.verdict).toBe('measuring')
    expect(g.fps).toBe(0)
  })
})
