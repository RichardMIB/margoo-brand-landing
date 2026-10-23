import { describe, expect, it, vi } from 'vitest'
import { createScrollEngine, type EngineEnv, type EnvHandlers, type FrameState } from './scrollEngine'

/** Ambiente falso: quadros disparados à mão, scroll e preferência controlados pelo teste. */
function fakeEnv(opts: { reduce?: boolean } = {}) {
  let queue = new Map<number, (now: number) => void>()
  let nextId = 1
  let clock = 0
  const fake = {
    y: 0,
    reduce: opts.reduce ?? false,
    hidden: false,
    handlers: null as EnvHandlers | null,
    listening: false,
    /** Avança o relógio e roda os quadros pendentes. */
    tick(ms = 16) {
      clock += ms
      const run = queue
      queue = new Map()
      for (const cb of run.values()) cb(clock)
    },
    get pending() {
      return queue.size
    },
  }
  const env: EngineEnv = {
    requestFrame(cb) {
      queue.set(nextId, cb)
      return nextId++
    },
    cancelFrame: (id) => void queue.delete(id),
    now: () => clock,
    scrollY: () => fake.y,
    viewport: () => ({ vw: 1440, vh: 900, maxScroll: 8000 }),
    prefersReducedMotion: () => fake.reduce,
    hidden: () => fake.hidden,
    listen(h) {
      fake.handlers = h
      fake.listening = true
      return () => {
        fake.listening = false
      }
    },
  }
  return { fake, env }
}

const recorder = () => {
  const frames: FrameState[] = []
  return { frames, client: { frame: (s: FrameState) => frames.push({ ...s }), dispose: vi.fn() } }
}

describe('createScrollEngine', () => {
  it('funciona sem nenhum cliente (cena 3D ainda não carregou)', () => {
    const { fake, env } = fakeEnv()
    const engine = createScrollEngine(() => env)
    engine.start()
    expect(() => fake.tick()).not.toThrow()
    expect(fake.pending).toBe(1)
  })

  it('aceita cliente registrado depois do start (lazy) e entrega o estado a cada quadro', () => {
    const { fake, env } = fakeEnv()
    const engine = createScrollEngine(() => env)
    engine.start()
    fake.tick()
    const { frames, client } = recorder()
    engine.add(client)
    fake.y = 100
    fake.tick(16)
    expect(frames).toHaveLength(1)
    expect(frames[0]).toMatchObject({ scrollY: 100, vw: 1440, vh: 900, still: false })
    expect(frames[0].velocity).toBeGreaterThan(0)
  })

  it('start duas vezes (StrictMode) não cria dois loops', () => {
    const { fake, env } = fakeEnv()
    const engine = createScrollEngine(() => env)
    engine.start()
    engine.start()
    expect(fake.pending).toBe(1)
  })

  it('limita o dt em 0.05s após a aba ficar em segundo plano', () => {
    const { fake, env } = fakeEnv()
    const engine = createScrollEngine(() => env)
    const { frames, client } = recorder()
    engine.add(client)
    engine.start()
    fake.tick(5000)
    expect(frames[0].dt).toBe(0.05)
  })

  it('suaviza o mouse em direção ao alvo', () => {
    const { fake, env } = fakeEnv()
    const engine = createScrollEngine(() => env)
    const { frames, client } = recorder()
    engine.add(client)
    engine.start()
    fake.handlers!.onPointer(0.5, -0.5)
    fake.tick()
    expect(frames[0].mouseX).toBeCloseTo(0.03)
    for (let i = 0; i < 200; i++) fake.tick()
    expect(frames.at(-1)!.mouseX).toBeCloseTo(0.5)
    expect(frames.at(-1)!.mouseY).toBeCloseTo(-0.5)
  })

  it('remover o cliente chama dispose e para de entregar quadros', () => {
    const { fake, env } = fakeEnv()
    const engine = createScrollEngine(() => env)
    const { frames, client } = recorder()
    const remove = engine.add(client)
    engine.start()
    fake.tick()
    remove()
    remove()
    fake.tick()
    expect(frames).toHaveLength(1)
    expect(client.dispose).toHaveBeenCalledTimes(1)
  })

  it('stop cancela o loop e solta os ouvintes', () => {
    const { fake, env } = fakeEnv()
    const engine = createScrollEngine(() => env)
    engine.start()
    engine.stop()
    expect(fake.pending).toBe(0)
    expect(fake.listening).toBe(false)
    expect(engine.running).toBe(false)
  })

  describe('independente da taxa de quadros', () => {
    /** Roda `seconds` a `hz` quadros/s com o mouse no canto e o scroll a 1200 px/s. */
    const simulate = (hz: number, seconds: number) => {
      const { fake, env } = fakeEnv()
      const engine = createScrollEngine(() => env)
      const { frames, client } = recorder()
      engine.add(client)
      engine.start()
      fake.handlers!.onPointer(0.5, -0.5)
      for (let i = 0; i < hz * seconds; i++) {
        fake.y += 1200 / hz
        fake.tick(1000 / hz)
      }
      return frames.at(-1)!
    }

    it.each([0.25, 0.5, 1])('60 Hz e 120 Hz dão o mesmo mouse e a mesma velocidade após %ss', (seconds) => {
      const at60 = simulate(60, seconds)
      const at120 = simulate(120, seconds)
      expect(at120.mouseX).toBeCloseTo(at60.mouseX, 6)
      expect(at120.mouseY).toBeCloseTo(at60.mouseY, 6)
      expect(at120.velocity).toBeCloseTo(at60.velocity, 3)
      expect(at120.scrollY).toBeCloseTo(at60.scrollY, 6)
    })

    it('144 Hz também bate com 60 Hz', () => {
      expect(simulate(144, 0.5).mouseX).toBeCloseTo(simulate(60, 0.5).mouseX, 6)
    })
  })

  it('aba oculta para o loop; ao voltar, retoma', () => {
    const { fake, env } = fakeEnv()
    const engine = createScrollEngine(() => env)
    engine.start()
    fake.hidden = true
    fake.handlers!.onVisibilityChange()
    expect(fake.pending).toBe(0)
    fake.hidden = false
    fake.handlers!.onVisibilityChange()
    expect(fake.pending).toBe(1)
  })

  describe('movimento reduzido', () => {
    it('sem loop contínuo: um quadro parado ao iniciar e outro só quando o scroll muda', () => {
      const { fake, env } = fakeEnv({ reduce: true })
      const engine = createScrollEngine(() => env)
      const { frames, client } = recorder()
      engine.add(client)
      engine.start()
      fake.tick()
      fake.tick()
      expect(frames).toHaveLength(1)
      expect(frames[0]).toMatchObject({ still: true, velocity: 0, mouseX: 0 })

      fake.y = 300
      fake.handlers!.onScrollOrResize()
      fake.handlers!.onScrollOrResize() // vários eventos no mesmo quadro viram um desenho só
      fake.tick()
      expect(frames).toHaveLength(2)
      expect(frames[1]).toMatchObject({ still: true, scrollY: 300 })
    })

    it('cliente que chega depois (cena lazy) recebe um quadro parado', () => {
      const { fake, env } = fakeEnv({ reduce: true })
      const engine = createScrollEngine(() => env)
      engine.start()
      fake.tick()
      const { frames, client } = recorder()
      engine.add(client)
      fake.tick()
      expect(frames).toEqual([expect.objectContaining({ still: true })])
    })

    it('trocar a preferência com a página aberta liga ou desliga o loop', () => {
      const { fake, env } = fakeEnv()
      const engine = createScrollEngine(() => env)
      const { frames, client } = recorder()
      engine.add(client)
      engine.start()
      fake.tick()
      expect(frames.at(-1)!.still).toBe(false)

      fake.reduce = true
      fake.handlers!.onReducedMotionChange()
      fake.tick()
      fake.tick()
      expect(frames.at(-1)!.still).toBe(true)
      expect(fake.pending).toBe(0)

      fake.reduce = false
      fake.handlers!.onReducedMotionChange()
      fake.tick()
      expect(frames.at(-1)!.still).toBe(false)
      expect(fake.pending).toBe(1)
    })
  })
})
