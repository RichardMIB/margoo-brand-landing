import { describe, expect, it } from 'vitest'
import { business } from '../data/content'
import { buildHeadTags, buildJsonLd, buildRobots, buildSitemap, jsonForScript, resolveSiteUrl, seo } from './seo'

describe('resolveSiteUrl', () => {
  it('usa SITE_URL e normaliza para a origem', () => {
    expect(resolveSiteUrl({ SITE_URL: 'https://margoobrand.com.br/qualquer/' })).toBe('https://margoobrand.com.br')
  })
  it('cai no domínio de produção da Vercel', () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'margoo99.vercel.app' })).toBe('https://margoo99.vercel.app')
  })
  it('sem nenhum: null (dev)', () => {
    expect(resolveSiteUrl({})).toBeNull()
  })
  it('URL inválida derruba o build', () => {
    expect(() => resolveSiteUrl({ SITE_URL: 'não é url' })).toThrow()
  })
})

describe('buildJsonLd', () => {
  const ld = buildJsonLd('https://exemplo.com')

  it('é uma ClothingStore com endereço, horários, Instagram e site', () => {
    expect(ld['@type']).toBe('ClothingStore')
    expect(ld.address.addressLocality).toBe('Fortaleza')
    expect(ld.address.streetAddress).toContain('Av. Beira Mar, 3960')
    expect(ld.openingHoursSpecification).toHaveLength(2)
    expect(ld.openingHoursSpecification[1].dayOfWeek).toEqual(['https://schema.org/Saturday'])
    expect(ld.sameAs).toContain(business.instagram.url)
    expect(ld.url).toBe('https://exemplo.com/')
    expect(ld.image).toBe('https://exemplo.com/og.jpg')
  })

  it('não inventa dados pendentes (telefone e CEP)', () => {
    expect(ld).not.toHaveProperty('telephone')
    expect(ld.address).not.toHaveProperty('postalCode')
  })

  it('sem domínio, não publica url nem imagem relativas', () => {
    const local = buildJsonLd(null)
    expect(local).not.toHaveProperty('url')
    expect(local).not.toHaveProperty('image')
  })
})

describe('buildHeadTags', () => {
  it('com domínio: canonical, og:image absoluta 1200×630 e twitter card grande', () => {
    const html = buildHeadTags('https://exemplo.com')
    expect(html).toContain('<link rel="canonical" href="https://exemplo.com/" />')
    expect(html).toContain('<meta property="og:image" content="https://exemplo.com/og.jpg" />')
    expect(html).toContain('<meta property="og:image:width" content="1200" />')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />')
    expect(html).toContain('application/ld+json')
  })

  it('sem domínio: nenhuma tag com URL', () => {
    const html = buildHeadTags(null)
    expect(html).not.toContain('og:image"')
    expect(html).not.toContain('canonical')
    expect(html).toContain(`content="${seo.title}"`)
  })

  it('JSON-LD não pode fechar a tag <script>', () => {
    expect(jsonForScript({ a: '</script><script>alert(1)</script>' })).not.toContain('</script>')
  })
})

describe('robots e sitemap', () => {
  it('robots libera tudo e só aponta sitemap com domínio', () => {
    expect(buildRobots(null)).toBe('User-agent: *\nAllow: /\n')
    expect(buildRobots('https://exemplo.com')).toContain('Sitemap: https://exemplo.com/sitemap.xml')
  })
  it('sitemap com a URL absoluta da página', () => {
    expect(buildSitemap('https://exemplo.com')).toContain('<loc>https://exemplo.com/</loc>')
  })
})
