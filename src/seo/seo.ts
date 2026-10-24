import { business, hero } from '../data/content.ts'

/**
 * SEO e compartilhamento gerados a partir do content.ts (fonte única dos dados da loja).
 * Usado no build pelo plugin do vite.config.ts, que injeta as tags no index.html: o conteúdo
 * fica no HTML que chega do servidor, onde buscadores e prévias de link (WhatsApp, Instagram)
 * leem, sem depender de JavaScript.
 */

export const seo = {
  title: 'Margoo Brand | Moda feminina na Beira-Mar, Fortaleza',
  description:
    'Boutique feminina na Galeria Via Scala, Beira-Mar de Fortaleza. Alfaiataria, tricot, bordados e peças de festa, com atendimento de consultoras pelo WhatsApp.',
  /** Imagem de compartilhamento 1200×630 (npm run bake:social). */
  image: { path: '/og.jpg', width: 1200, height: 630, alt: hero.title },
  locale: 'pt_BR',
} as const

/** URL pública do site: SITE_URL, ou o domínio de produção que a Vercel informa no build. */
export function resolveSiteUrl(env: Record<string, string | undefined>): string | null {
  const raw = env.SITE_URL ?? (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
  if (!raw) return null
  const url = new URL(raw) // lança se vier inválida: melhor falhar o build que publicar tag quebrada
  return url.origin
}

/** Dados estruturados schema.org (ClothingStore). Sem telefone e CEP: ainda pendentes. */
export function buildJsonLd(siteUrl: string | null) {
  const { address } = business
  return {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: business.name,
    description: seo.description,
    ...(siteUrl && { url: `${siteUrl}/`, image: `${siteUrl}${seo.image.path}` }),
    priceRange: business.priceRange,
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${address.street}, ${address.unit}, ${address.gallery}`,
      addressLocality: address.city,
      addressRegion: address.region,
      addressCountry: address.country,
    },
    openingHoursSpecification: business.hours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days.map((d) => `https://schema.org/${d}`),
      opens: h.opens,
      closes: h.closes,
    })),
    hasMap: business.mapsUrl,
    sameAs: [business.instagram.url, business.onlineStore],
  }
}

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** JSON dentro de <script>: "<" escapado para nenhum texto fechar a tag (</script>). */
export const jsonForScript = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')

/** Tags do <head>: título, descrição, canonical, Open Graph, Twitter card e JSON-LD. */
export function buildHeadTags(siteUrl: string | null): string {
  const meta = (attr: 'name' | 'property', key: string, value: string) =>
    `<meta ${attr}="${key}" content="${escapeAttr(value)}" />`
  const tags = [
    `<title>${escapeAttr(seo.title)}</title>`,
    meta('name', 'description', seo.description),
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', business.name),
    meta('property', 'og:locale', seo.locale),
    meta('property', 'og:title', seo.title),
    meta('property', 'og:description', seo.description),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', seo.title),
    meta('name', 'twitter:description', seo.description),
  ]
  // Prévias de link exigem URL absoluta: sem domínio conhecido (dev), essas tags ficam de fora
  if (siteUrl) {
    const image = `${siteUrl}${seo.image.path}`
    tags.splice(2, 0, `<link rel="canonical" href="${siteUrl}/" />`)
    tags.push(
      meta('property', 'og:url', `${siteUrl}/`),
      meta('property', 'og:image', image),
      meta('property', 'og:image:width', String(seo.image.width)),
      meta('property', 'og:image:height', String(seo.image.height)),
      meta('property', 'og:image:alt', seo.image.alt),
      meta('name', 'twitter:image', image),
    )
  }
  tags.push(`<script type="application/ld+json">${jsonForScript(buildJsonLd(siteUrl))}</script>`)
  return tags.join('\n    ')
}

/** robots.txt: tudo liberado; aponta o sitemap quando o domínio é conhecido. */
export function buildRobots(siteUrl: string | null): string {
  return ['User-agent: *', 'Allow: /', ...(siteUrl ? ['', `Sitemap: ${siteUrl}/sitemap.xml`] : [])].join('\n') + '\n'
}

/** sitemap.xml de uma página só (precisa de URL absoluta, então só existe com domínio). */
export function buildSitemap(siteUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}/</loc></url>
</urlset>
`
}
