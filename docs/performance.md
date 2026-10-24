# Performance — medições

Como medir de novo (Git Bash):

```bash
npm run build && npx vite preview --port 4400 --strictPort &
npx -y lighthouse@12 http://localhost:4400/ --only-categories=performance --form-factor=mobile --chrome-flags="--headless=new" --view
```

Método: Lighthouse 12.8.2 (CLI, mesma engine da aba Lighthouse do Chrome), modo **Mobile** (Moto G Power emulado, 4G lento simulado, CPU 4× mais lenta), build de produção servido pelo `vite preview`, **3 rodadas, vale a mediana**. Notas de uma rodada só oscilam ±3 pontos.

## Linha de base — antes da cena 3D (Fase 3, commit `f8e6d53`, 19/10/2026)

| Rodada | Performance | LCP | CLS | FCP | TBT | Speed Index |
|---|---|---|---|---|---|---|
| 1 | 87 | 3,02 s | 0 | 2,80 s | 44 ms | 4,77 s |
| 2 | 85 | 3,11 s | 0 | 2,89 s | 0 ms | 5,18 s |
| 3 | 86 | 3,01 s | 0 | 2,78 s | 0 ms | 5,10 s |
| **Mediana** | **86** | **3,02 s** | **0** | **2,80 s** | **0 ms** | **5,10 s** |

**Elemento do LCP:** o título `<h1>` do hero (texto, não foto).
**Fases do LCP:** TTFB 0,46 s (15%) + atraso de renderização 2,55 s (85%). Nenhum tempo de download de imagem.

O atraso de renderização vem de duas coisas:

1. **CSS do Google Fonts bloqueia a pintura** (~1,05 s estimados pelo Lighthouse). Correção prevista na Fase 5 (#5): fontes no próprio site, com `preload` só das usadas na primeira dobra.
2. **A página é montada pelo React no navegador**: o `index.html` chega com `<div id="root">` vazio, e o `<h1>` só existe depois que o JS (77 kB gzip) baixa e roda. Correção possível: pré-renderizar o HTML estático no build. Fica registrada como dívida, a decidir na Fase 5.

Meta da Fase 4: a cena 3D carregada com lazy **não pode piorar o LCP em mais de 10%** (teto: 3,32 s na mediana).

## Fase 4 — com a cena 3D (fechada em 22/10/2026)

Mesmo método (Lighthouse 12.8.2 Mobile, 3 rodadas, mediana). O Chrome do Lighthouse local usou a GPU da máquina (Intel HD Graphics, D3D11).

| Versão | Performance | LCP | FCP | CLS | TBT |
|---|---|---|---|---|---|
| **Linha de base** (sem 3D) | 86 | **3,02 s** | 2,80 s | 0 | 0 ms |
| 3D antes (primeira versão) | 44 | 4,28 s (+42%) | 3,42 s | 0 | ~9.900 ms |
| 3D + `compileAsync` + sem cena em WebGL por software | 45 | 4,16 s (+38%) | 3,32 s | 0 | ~9.000 ms |
| 3D + reflexo pré-calculado (ADR 003) | 49 | 4,15 s (+37%) | 3,30 s | 0 | 1.696 ms |
| **3D depois** (+ início depois do LCP e ocioso) | 61 | **3,00 s (−1%)** | 2,71 s | 0 | 1.478 ms |

Critério da fase: LCP no máximo 10% acima da linha de base (3,32 s). **Cumprido: 3,00 s.**

### O que cada passo resolveu

1. **Shaders do MeshPhysicalMaterial**: `compileAsync` com `KHR_parallel_shader_compile`. Trava na thread principal de 1,5 s → 10 ms (a compilação, ~0,9 s, vai para outra thread).
2. **Sem GPU** (WebGL por software, ambiente do PageSpeed Insights): cada quadro travava ~500 ms. A cena não carrega nesse caso (`failIfMajorPerformanceCaveat`).
3. **Reflexo de ambiente (PMREM)**: gerado ao vivo, compilava os shaders internos do PMREM de forma síncrona: **2,2–2,5 s travando**, independente da resolução (32 custava o mesmo que 128). Agora vem pré-calculado do build (`npm run bake:env`, 100 kB) e não roda nenhum shader extra. Maior tarefa longa da largada: 2.336 ms → 189 ms.
4. **Momento de início**: começando logo após o `load` (~1,2 s no trace), o download e a execução do pedaço do 3D (245 kB gzip) caíam antes do LCP observado (~2,6 s), e o modo simulado do Lighthouse somava esse trabalho ao LCP. Agora a cena espera `load` + fontes + primeiro LCP + momento ocioso (`requestIdleCallback` com timeout de 3 s; `setTimeout` de 1,2 s no Safari). O 3D passou a ser pedido em ~2,67 s, logo depois do LCP.

### O que ainda pesa (dívida registrada)

- **TBT de ~1,5 s e nota 61**: é o navegador avaliando o pedaço de 920 kB (three + R3F) e montando a cena *depois* do LCP; o Lighthouse multiplica por 4 cada tarefa observada. O R3F importa o three inteiro (sem tree-shaking). Caminhos possíveis: dividir a largada em mais quadros ou trocar o R3F por three puro na cena (decisão de arquitetura, fora desta fase).
- **LCP de 3 s já na linha de base**: Google Fonts bloqueando a pintura + página montada pelo React. Correção na Fase 5 (#5).

### Tarefas longas da largada (CPU 4× mais lenta, GPU real, sem Lighthouse)

| | Antes | Depois |
|---|---|---|
| Maior tarefa | 2.640 ms | 189 ms |
| Soma acima de 50 ms (bloqueio) | 5.469 ms | 1.446 ms |
| Quadros depois da largada | 60 fps (mediana 16,7 ms) | 60 fps (mediana 16,7 ms) |

## Fase 5 — versão estática no celular + fontes no próprio site (23/10/2026)

Mesmo método, agora em **Mobile e Desktop** (`--preset=desktop`), 3 rodadas cada, mediana.

| | Performance | LCP | FCP | CLS | TBT | Speed Index | Acessib. | Boas práticas | SEO |
|---|---|---|---|---|---|---|---|---|---|
| Linha de base Mobile (Fase 3) | 86 | 3,02 s | 2,80 s | 0 | 0 ms | 5,10 s | — | — | — |
| 3D Mobile (Fase 4) | 61 | 3,00 s | 2,71 s | 0 | 1.478 ms | 5,08 s | — | — | — |
| **Fase 5 Mobile** | **96** | **2,58 s (−15%)** | **1,47 s** | 0 | 124 ms | 1,69 s | 100 | 100 | 100 |
| **Fase 5 Desktop** | **100** | **0,64 s** | 0,41 s | 0 | 0 ms | 0,64 s | 100 | 100 | 100 |

O que mudou:

- **Celular sem o pedaço do 3D (ADR 004):** recebe dois pôsteres da cena (12–24 kB cada, desenhados em canvas depois do conteúdo). Confirmado pela lista de arquivos baixados: nem `SceneCanvas-*.js` nem `envmap/` aparecem. O TBT caiu de ~1,5 s para ~0,1 s.
- **Fontes no próprio site:** sem o CSS do Google Fonts bloqueando a pintura (~1 s na linha de base), e com preload da fonte do H1. O FCP caiu de 2,80 s para 1,47 s.
- **SEO 100:** título, descrição, canonical, Open Graph, JSON-LD e `robots.txt` gerados no build.

**Atenção ao ler o Desktop:** esta máquina tem 4 núcleos lógicos, então pela regra do ADR 004 o Lighthouse Desktop mediu a **versão estática**. Num desktop com 5 núcleos ou mais, a página carrega o 3D ao vivo depois do LCP. O custo dele foi medido à parte:

- com a CPU normal, a fita a **57,9 fps de média** (mediana 60) com o mouse passeando sobre os botões de vidro;
- o LCP não muda, porque a cena só começa depois dele (Fase 4).

Dívida que continua: **v2, trocar R3F por three puro na cena para reduzir o pacote do 3D** (hoje ~245 kB gzip; afeta só o desktop forte).
