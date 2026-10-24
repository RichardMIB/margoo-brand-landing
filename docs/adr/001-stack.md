# ADR 001 — Stack da landing

- **Status:** aceito (19/10/2026, Fase 1)

## Contexto

Landing de uma loja física (Margoo Brand, Fortaleza). É peça de portfólio e pode virar o site oficial. Não tem backend, banco, login nem segredos. O protótipo aprovado (`referencia/prototipo.html`) usa HTML, CSS e three.js puro numa página só.

## Decisão

- **React 19 + Vite + TypeScript estrito.** Componentes por seção, conteúdo tipado num só lugar (`src/data/content.ts`) e build estático servido pela Vercel, no plano grátis.
- **Tailwind CSS v4 com `@theme`.** Os tokens da identidade (cores, fontes, breakpoints) ficam no CSS e viram utilitários; sem `tailwind.config` nem `postcss.config`. Efeitos com pseudo-elementos (vidro, letreiro, vitrine) ficam em CSS de componente, em `@layer components`.
- **three + @react-three/fiber v9 para a cena 3D** (detalhes no ADR 002). Sem drei: só seria usado o `RoomEnvironment`, que vem do próprio three.
- **Sem bibliotecas de animação (GSAP, Framer Motion, Lenis).** O protótipo resolve tudo com um motor de scroll próprio de ~200 linhas; uma biblioteca traria peso e um segundo `requestAnimationFrame` disputando o primeiro.
- **Vitest para funções puras e ESLint.** A regra visual "nenhuma foto cobre texto" é verificada num Chrome real (`npm run check:layout`), porque lint e testes unitários não enxergam layout.
- **Versões fixadas por compatibilidade:** TypeScript ~6.0 (o typescript-eslint 8.72 exige < 6.1), React ~19.3 (o peer do R3F 9.8 exige < 19.4).

## Consequências

- O HTML chega vazio e o React monta a página no navegador. Isso custa ~0,3 s de LCP e fica como dívida (pré-renderizar no build), registrada em `docs/performance.md`.
- O R3F importa o three inteiro, e o pedaço do 3D tem ~245 kB gzip. Registrado como dívida: **v2, trocar R3F por three puro na cena**.
