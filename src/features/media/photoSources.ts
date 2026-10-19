export interface ImageVariant {
  file: string
  width: number
}

export interface ImageEntry {
  width: number
  height: number
  variants: ImageVariant[]
}

/**
 * Monta src/srcSet a partir do manifesto gerado por `npm run images`.
 * Variantes com a mesma largura real (foto menor que 960px) viram uma só,
 * para o srcset nunca anunciar duas resoluções que na verdade são iguais.
 */
export function photoSources(entry: ImageEntry): { src: string; srcSet: string; width: number; height: number } {
  const byWidth = new Map<number, ImageVariant>()
  for (const v of entry.variants) if (!byWidth.has(v.width)) byWidth.set(v.width, v)
  const variants = [...byWidth.values()].sort((a, b) => a.width - b.width)
  if (variants.length === 0) throw new Error('Foto sem variantes no manifesto')
  const largest = variants[variants.length - 1]
  return {
    src: largest.file,
    srcSet: variants.map((v) => `${v.file} ${v.width}w`).join(', '),
    width: entry.width,
    height: entry.height,
  }
}
