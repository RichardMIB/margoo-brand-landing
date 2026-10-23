/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
