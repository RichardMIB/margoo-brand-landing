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

## Fase 4 — com a cena 3D (em andamento, 22/10/2026)

Mesmo método (Lighthouse 12.8.2 Mobile, 3 rodadas, mediana). O Chrome do Lighthouse local usou a GPU da máquina (Intel HD Graphics, D3D11).

| Versão | Performance | LCP | CLS | TBT | Observação |
|---|---|---|---|---|---|
| Linha de base (sem 3D) | 86 | 3,02 s | 0 | 0 ms | |
| 3D, primeira versão | 44 | 4,28 s (+42%) | 0 | ~9.900 ms | shaders e ambiente compilados de forma síncrona |
| 3D + `compileAsync` + sem cena em WebGL por software | 45 | 4,16 s (+38%) | 0 | ~9.000 ms | ainda acima do teto de +10% (3,32 s) |

### Onde está o custo (medido com tarefas longas, CPU 4× mais lenta, GPU real)

| Etapa da largada da cena | Antes | Depois |
|---|---|---|
| Compilar shaders do MeshPhysicalMaterial | 1,5 s travando | 10 ms (o resto, ~0,9 s, roda em paralelo via `KHR_parallel_shader_compile`) |
| Primeiro quadro | — | 42 ms |
| Gerar o ambiente (PMREM do RoomEnvironment) | 1,9 s | **2,2–2,5 s travando** — é compilação dos shaders internos do PMREM, não resolução (tamanho 32 custa o mesmo que 128) |
| Cada quadro depois da largada | — | < 1 ms de desenho; 60 fps (mediana 16,7 ms) |

Por que o Lighthouse amplifica: no modo simulado ele multiplica cada tarefa observada pela desaceleração de CPU (4×). A tarefa de ~2,3 s do PMREM vira ~9 s de TBT e, por começar antes do LCP observado, empurra o LCP.

**Sem GPU** (WebGL por software, caso do PageSpeed Insights): cada quadro travava ~500 ms. Agora a cena não carrega nesse caso (`failIfMajorPerformanceCaveat`) e o bloqueio volta ao da página sem 3D (~0,5 s, montagem do React).

Pendente: tirar o PMREM da thread principal (ver decisão em aberto na issue #4).
