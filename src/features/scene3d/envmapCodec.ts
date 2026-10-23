/**
 * Codec do mapa de ambiente pré-calculado (saída do PMREM, layout CubeUV do three).
 *
 * O PMREM gera cores HDR (acima de 1) em half float. Para caber em poucos kB:
 * - RGBE: 8 bits de mantissa por canal + expoente compartilhado no 4º byte (formato do .hdr);
 *   guarda brilhos altos sem perder os escuros.
 * - Filtro Paeth por canal (o melhor filtro do PNG): grava a diferença para uma previsão feita
 *   com os vizinhos da esquerda, de cima e da diagonal. Gradientes suaves viram quase só zeros,
 *   que o gzip comprime muito melhor. (Sem usar PNG de verdade: o navegador pré-multiplicaria
 *   o alfa e estragaria o expoente do RGBE.)
 *
 * Funções puras sem dependências: usadas pela página (decodificar) e pelo scripts/bake-envmap.mjs
 * (codificar), que importa este arquivo direto no Node.
 */

/** Half float (IEEE 754 binary16, em Uint16) → número. */
export function halfToFloat(h: number): number {
  const sign = h & 0x8000 ? -1 : 1
  const exp = (h >> 10) & 0x1f
  const frac = h & 0x3ff
  if (exp === 0) return sign * 2 ** -14 * (frac / 1024)
  if (exp === 31) return frac ? NaN : sign * Infinity
  return sign * 2 ** (exp - 15) * (1 + frac / 1024)
}

const f32 = new Float32Array(1)
const u32 = new Uint32Array(f32.buffer)

/** Número → half float (Uint16), com arredondamento para o mais próximo. */
export function floatToHalf(value: number): number {
  f32[0] = value
  const x = u32[0]
  const sign = (x >> 16) & 0x8000
  const exp = ((x >> 23) & 0xff) - 127 + 15
  let mant = x & 0x7fffff
  if (exp <= 0) {
    if (exp < -10) return sign
    mant = (mant | 0x800000) >> (1 - exp)
    return sign | ((mant + 0x1000) >> 13)
  }
  if (exp >= 31) return sign | 0x7c00
  const h = sign | (exp << 10) | (mant >> 13)
  return h + ((mant >> 12) & 1) // arredonda; o carry no expoente é o comportamento correto
}

/** RGB linear (≥ 0) → RGBE de 4 bytes. */
export function encodeRGBEPixel(r: number, g: number, b: number, out: Uint8Array, o: number): void {
  const max = Math.max(r, g, b)
  if (max < 1e-32) {
    out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0
    return
  }
  let e = Math.ceil(Math.log2(max)) // max ≤ 2^e
  let scale = 256 / 2 ** e // max * scale fica em (128, 256]
  if (Math.round(max * scale) > 255) {
    // potência exata de 2 (ou quase): o canal não cabe em 8 bits, sobe o expoente
    e += 1
    scale /= 2
  }
  out[o] = Math.round(r * scale)
  out[o + 1] = Math.round(g * scale)
  out[o + 2] = Math.round(b * scale)
  out[o + 3] = e + 128
}

/** Filtro Sub do PNG, por linha e por canal (stride 4). Altera no lugar. */
export function subFilter(bytes: Uint8Array, width: number): Uint8Array {
  const row = width * 4
  for (let y = 0; y < bytes.length; y += row)
    for (let i = y + row - 1; i >= y + 4; i--) bytes[i] = (bytes[i] - bytes[i - 4]) & 0xff
  return bytes
}

/** Desfaz o filtro Sub. Altera no lugar. */
export function unSubFilter(bytes: Uint8Array, width: number): Uint8Array {
  const row = width * 4
  for (let y = 0; y < bytes.length; y += row)
    for (let i = y + 4; i < y + row; i++) bytes[i] = (bytes[i] + bytes[i - 4]) & 0xff
  return bytes
}

const paeth = (a: number, b: number, c: number) => {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

/** Filtro Paeth do PNG (stride 4): a = esquerda, b = cima, c = diagonal. Devolve um novo array. */
export function paethFilter(bytes: Uint8Array, width: number): Uint8Array {
  const row = width * 4
  const out = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    const x = i % row
    const a = x >= 4 ? bytes[i - 4] : 0
    const b = i >= row ? bytes[i - row] : 0
    const c = x >= 4 && i >= row ? bytes[i - row - 4] : 0
    out[i] = (bytes[i] - paeth(a, b, c)) & 0xff
  }
  return out
}

/** Desfaz o filtro Paeth. Altera no lugar (cada byte depende dos já reconstruídos). */
export function unPaethFilter(bytes: Uint8Array, width: number): Uint8Array {
  const row = width * 4
  for (let i = 0; i < bytes.length; i++) {
    const x = i % row
    const a = x >= 4 ? bytes[i - 4] : 0
    const b = i >= row ? bytes[i - row] : 0
    const c = x >= 4 && i >= row ? bytes[i - row - 4] : 0
    bytes[i] = (bytes[i] + paeth(a, b, c)) & 0xff
  }
  return bytes
}

/** Pixels half float RGBA → RGBE filtrado, pronto para o gzip. */
export function encodeEnvmap(halfRGBA: Uint16Array, width: number): Uint8Array {
  const out = new Uint8Array(halfRGBA.length)
  for (let p = 0; p < halfRGBA.length; p += 4)
    encodeRGBEPixel(
      Math.max(halfToFloat(halfRGBA[p]), 0),
      Math.max(halfToFloat(halfRGBA[p + 1]), 0),
      Math.max(halfToFloat(halfRGBA[p + 2]), 0),
      out,
      p,
    )
  return paethFilter(out, width)
}

/** RGBE filtrado → half float RGBA (alfa 1), o formato da textura do PMREM. */
export function decodeEnvmap(filtered: Uint8Array, width: number): Uint16Array {
  const rgbe = unPaethFilter(filtered, width)
  const out = new Uint16Array(rgbe.length)
  const ONE = 0x3c00 // 1.0 em half float
  for (let p = 0; p < rgbe.length; p += 4) {
    const e = rgbe[p + 3]
    const scale = e === 0 ? 0 : 2 ** (e - 128) / 256
    out[p] = floatToHalf(rgbe[p] * scale)
    out[p + 1] = floatToHalf(rgbe[p + 1] * scale)
    out[p + 2] = floatToHalf(rgbe[p + 2] * scale)
    out[p + 3] = ONE
  }
  return out
}
