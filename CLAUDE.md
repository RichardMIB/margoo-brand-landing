# Margoo Brand — Landing page

Landing page da **Margoo Brand**, boutique de moda feminina em Fortaleza (CE). Projeto da **DataCode Studio** (Richard, GitHub `RichardMIB`).
Uso duplo: (1) peça de portfólio no 99freelas; (2) se os donos aprovarem, landing oficial da loja. Construir com qualidade de entrega real para cliente.

**Fonte da verdade visual:** `referencia/prototipo.html` (protótipo aprovado, HTML único com Three.js). A implementação deve reproduzir o protótipo fielmente: textos, ordem das seções, cores, tipografia, efeitos. Onde este arquivo e o protótipo divergirem, vale este arquivo.

## O negócio

- Loja física: **Av. Beira Mar, 3960, Loja 16, Galeria Via Scala** (anexa ao Hotel Gran Marquise), Meireles, Fortaleza. Mudou de endereço recentemente.
- Horário: segunda a sexta, 9h às 19h; sábado, 9h às 14h.
- Loja online (Nuvemshop): https://margoobrand.com.br/ — a landing **não compete** com ela; leva a cliente para a loja física, para o WhatsApp ou para a Nuvemshop.
- Instagram: https://www.instagram.com/margoobrand_/
- Atendimento por WhatsApp com duas consultoras: **Margarida** e **Edna** (números ainda pendentes → placeholder em `src/data/content.ts`).
- Peças de R$300 a R$1.500, parcelamento em até 12x. Público: mulher de Fortaleza com poder de compra que compra para ocasiões.
- **Objetivo principal da landing:** levar a cliente à loja física e ao WhatsApp. Secundário: loja online.

## Ambiente

- Windows, projeto em `C:\dev\margoo99`. Terminal do VS Code: **Git Bash**.
- Todo comando do projeto (README, docs, instruções ao Richard, scripts npm) é escrito para **bash**: `/c/dev/margoo99`, barras `/`, `&&`, `$VAR`, heredoc. Nada de sintaxe PowerShell ou cmd.

## Stack (decidida)

- **React + Vite + TypeScript (strict) + Tailwind CSS v4**
- TypeScript fixado em **~6.0**: o `typescript-eslint` ainda não aceita TS ≥ 6.1 (o template do Vite traz TS 7). Só subir quando o `typescript-eslint` suportar.
- **3D:** three + @react-three/fiber (+ @react-three/drei só se realmente precisar). Usar versões estáveis e compatíveis entre si (ex.: React 19 com R3F v9).
- **Scroll/motion:** um único motor próprio com `requestAnimationFrame` (como no protótipo). **Não** adicionar GSAP, Framer Motion ou Lenis.
- Testes: Vitest para funções puras. Lint: ESLint. Deploy: Vercel (plano grátis), conectado ao GitHub.
- Sem backend, sem banco, sem variáveis secretas.

## Identidade visual

Tokens no CSS com `@theme` do **Tailwind v4** (`src/styles/index.css`, plugin `@tailwindcss/vite`). **Não** existe `tailwind.config.js` nem `postcss.config`. Cada token vira variável CSS e utilitário (ex.: `--color-ink` → `text-ink`):

| Token | Valor | Uso |
|---|---|---|
| ground | `#CBBCA4` | fundo champanhe da página inteira |
| ground-deep | `#BDAC91` | fundo de placeholder das fotos |
| ink | `#232024` | texto principal, botão escuro |
| ink-soft | `#463F39` | texto secundário |
| pearl | `#F6F0E7` | texto sobre escuro, destaques claros |
| accent | `#6B522E` | números dos passos, detalhes |
| line | `rgba(35,32,36,.2)` | linhas divisórias |
| fita (3D) | `#A9824F` + sheen `#FFF1DA` | cetim caramelo |

- Fontes (hoje via Google Fonts; na Fase 5 passam a ser hospedadas no próprio site, issue #5): **Bodoni Moda** (títulos, 400) e **Jost** (texto, 300/400/500). Fallbacks: Didot/Georgia e Futura/system-ui.
- Logo em texto: `MARGOOBRAND`, Jost 500, `letter-spacing: .32em`.
- Fotos **flutuam** sobre o fundo: sombra suave longa, raio 3px, sem cards iguais em grade.
- Evitar: rótulos em CAIXA ALTA acima de títulos, "01/02/03" sem sequência real, emoji, seta "→" em botões.

## Seções (ordem)

1. **Header**: logo, nav (Coleções, A loja, Atendimento), botão vidro "Falar no WhatsApp".
2. **Hero**: "Boutique feminina na Beira-Mar, Fortaleza" / H1 "Para mulheres que se expressam através do que vestem." / texto / botões "Falar com uma consultora" (escuro) e "Ver a loja online" (claro). Colagem de 3 fotos flutuantes (vestido-assimetrico grande, jaqueta-strass, corset-vermelho).
3. **Letreiro duplo**: linha 1 "Alfaiataria, Tricot, Bordados, Festa, Cetim"; linha 2 (contorno) "Renda, Laise, Crepe, Malha canelada, Tafetá"; pérola entre palavras; andam em direções opostas com o scroll.
4. **Fatos**: Até 12x / Presencial e online / Seg a sex, 9h às 19h.
5. **Ocasiões** ("Uma ocasião, um look."): grade desencontrada com Alfaiataria (alfaiataria-colete), Festa (vestido-ombro), Vestidos (vestido-estampado), Renda e bordados (renda-branca), Tricot (body-tricot). Todas linkam para a Nuvemshop. **Regra:** nenhuma foto pode cobrir título ou legenda de outro item (inclusive com o parallax ativo); legendas ficam com `position: relative; z-index: 1`. Testar em 1280, 1440 e 1920 de largura.
6. **Na vitrine agora**: seção de 300vh com `position: sticky`; o scroll vertical move um trilho horizontal (camisa-seda, malha-canelada, tule-babados, vermelho-babado, retrato-off) + barra de progresso. No celular (≤760px) e com movimento reduzido vira carrossel normal de arrastar.
7. **Prove com calma** (3 passos numerados, é sequência real): mande o que gostou → separamos no seu tamanho → prove na loja ou receba em casa. Linha que se desenha com o scroll.
8. **Estamos de casa nova**: foto da fachada com moldura que abre no scroll + endereço + horários + "Como chegar" (Google Maps) e "Avisar que vou passar".
9. **Prefere conversar antes?**: cartões de vidro de Margarida e Edna com botão fumê "Chamar no WhatsApp" + ícone.
10. **Final** ("Cada detalhe conta."): seção alta e vazia onde as pérolas formam o colar. Botão "Como chegar".
11. **Footer**: logo, Instagram, loja online, "Site por DataCode Studio".

## 3D: fita de cetim + colar de pérolas (modo aprovado: "Fio + colar")

- Canvas **fixo** atrás da página inteira (`position: fixed; inset: 0; z-index: 0; pointer-events: none; aria-hidden`), conteúdo em `z-index: 1`.
- **Fita**: `PlaneGeometry` 240×20 segmentos, vértices recalculados por quadro (seno/cosseno, torção ao longo do comprimento, dobras finas). `MeshPhysicalMaterial` com sheen + clearcoat, `RoomEnvironment` via PMREM. Copiar a função `ribbonAt` do protótipo.
- **Scroll** (progresso p de 0 a 1 da página): a fita gira (`phase = p*11`), desloca em x/y e muda a rotação z. A partir de p≈0.8 ela desce e encolhe.
- **Vento**: velocidade do scroll aumenta a amplitude da ondulação; parado, acalma.
- **Pérolas**: 25 esferas iridescentes. Começam espalhadas (6 visíveis no topo, as outras aparecem entre p 0.15 e 0.45) e entre p 0.8 e 0.97 interpolam para um colar em U que pende dos cantos de cima da tela e passa por baixo do título final. Posições do colar recalculadas no resize a partir da largura visível.
- Mouse (só ponteiro fino): leve rotação amortecida da cena.
- **Performance obrigatória**: canvas carregado com `React.lazy` depois do conteúdo (não pode atrasar o LCP), `dpr` máx. 1.75, pausar quando a aba está oculta, liberar recursos no unmount, tratar `webglcontextlost`. Sem WebGL → página funciona sem a cena.
- **Movimento reduzido** (`prefers-reduced-motion`): cena desenhada parada, sem loop contínuo.

## Efeitos de scroll no DOM (um motor rAF só)

- `src/features/motion/scrollEngine.ts` é o **único dono do `requestAnimationFrame`**. O R3F roda com `frameloop="never"` e o motor chama `advance()` da cena a cada quadro. A cena é lazy: o motor funciona sem ela e a registra quando carregar (sem erro se nunca carregar, ex.: sem WebGL).
- Do protótipo, **não** portar o painel `.proto` nem o modo `'hero'`: só existe o modo "Fio + colar".

- Fotos com `data-depth`: parallax no mouse e no scroll.
- Parallax interno: a imagem tem 116% de altura e desliza dentro da moldura.
- Hero: texto sobe mais devagar que a página.
- Títulos entram deslizando de lado — **sempre visíveis**, só deslocados (nunca começar com opacity 0).
- Tudo isso desligado com movimento reduzido.

## Botões e cartões de vidro

- `.btn` claro: gradiente branco translúcido + `backdrop-filter: blur(14px) saturate(160%)` + borda branca + sombras internas.
- `.btn` escuro: vidro fumê grafite com reflexo champanhe.
- Hover: luz radial segue o cursor (variáveis `--mx/--my` setadas por JS), inclinação 3D (`--rx/--ry`, menor nos cartões), leve magnetismo, reflexo que atravessa (`::after`), sobe 3px; `:active` afunda (scale .97).
- Fallback sem `backdrop-filter`: fundo pérola quase opaco.
- Criar componentes reutilizáveis `GlassButton` (variantes `light`/`dark`, renderiza `<a>`) e `ContactCard`, com o efeito num hook `useGlassPointer`.
- **Medir** no painel Performance do Chrome: vidro sobre a fita animada pode pesar. Se cair de ~50fps, reduzir o blur ou pausar a fita durante hover.

## Conteúdo e dados

- Todo texto, links, contatos e lista de fotos em `src/data/content.ts` (tipado). Componentes não têm texto solto.
- Link do WhatsApp gerado por função pura `whatsappLink(phone, message)` → `https://wa.me/55DDDNUMERO?text=...` (com testes Vitest). Mensagem padrão: "Olá! Vim pelo site da Margoo Brand e quero ajuda para escolher uma peça."
- Números das consultoras: **pendentes**. Deixar `phone: null` e, enquanto for null, o cartão aponta para a seção de atendimento e mostra "[NÚMERO]".

## Fotos

- `referencia/img2/*.jpg` e `referencia/img/fachada.jpg` são **provisórias** (capturas de tela da loja online). Para produção, trocar pelos arquivos originais das sessões de fotos.
- `npm run images` (`scripts/optimize-images.mjs`, sharp) gera **WebP** em 480 e 960 de largura em `public/img/` e o manifesto `src/data/images.generated.json` com a largura real de cada arquivo (fotos menores que 960 não são ampliadas). **AVIF fica para depois.** Usar `srcset`/`sizes`, `loading="lazy"` fora da primeira dobra, `alt` descritivo em português (vestidos e peças, não "imagem").

## SEO e compartilhamento

- `<title>` "Margoo Brand | Moda feminina na Beira-Mar, Fortaleza", meta description, Open Graph + Twitter card com imagem 1200×630, `lang="pt-BR"`.
- JSON-LD `ClothingStore` com endereço, horários, Instagram e site.

## Qualidade

- TypeScript strict, ESLint sem erros, `npm run build` passando.
- Acessibilidade: foco visível, links reais (`<a href>`), contraste AA, navegação por teclado, `aria-hidden` no canvas.
- Responsivo testado em 360, 768 e 1280+.
- Nunca commitar `.env` (não há segredos neste projeto).

## Fluxo de trabalho

- Tarefas viram **GitHub Issues** no repo; corpo com `Prazo: DD/MM`. Commits com `Closes #N`.
- Decisões de arquitetura em `docs/adr/NNN-titulo.md`.
- README do repo é vitrine de portfólio: GIF/print do site, link do deploy, stack, desafios técnicos (fita 3D, colar no scroll, vidro), créditos ("Fotos: Margoo Brand, uso autorizado").
