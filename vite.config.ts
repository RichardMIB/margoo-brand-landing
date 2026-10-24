/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { buildHeadTags, buildRobots, buildSitemap, resolveSiteUrl } from './src/seo/seo.ts'

/**
 * SEO no build: tags no index.html, robots.txt e (com domínio) sitemap.xml.
 * Domínio: SITE_URL ou o domínio de produção que a Vercel informa no build.
 */
function seoTags(): Plugin {
  const siteUrl = resolveSiteUrl(process.env)
  return {
    name: 'margoo-seo',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: buildRobots(siteUrl) })
      if (siteUrl) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buildSitemap(siteUrl) })
    },
    transformIndexHtml(html) {
      if (!html.includes('<!--seo-->')) throw new Error('index.html sem o marcador <!--seo-->')
      return html.replace('<!--seo-->', buildHeadTags(siteUrl))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), seoTags()],
  build: {
    // O pedaço da cena 3D (three + R3F, ~920 kB / 245 kB gzip) é lazy: carrega depois da página
    // pronta e não entra no caminho do LCP. O aviso padrão de 500 kB só faria ruído.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
