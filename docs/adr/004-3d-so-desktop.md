# ADR 004 — 3D ao vivo só no desktop; pôsteres estáticos no resto

- **Status:** aceito (decisão de produto do Richard, 23/10/2026, Fase 5)

## Contexto

A cena 3D custa ~245 kB gzip de JavaScript, mais 100 kB do reflexo, e trabalho de CPU e GPU contínuo. No celular, isso pesa no plano de dados, na bateria e na nota do Lighthouse Mobile, e a tela pequena aproveita pouco o efeito. Em computadores fracos, o vidro sobre a fita cai abaixo de 50 fps (medido: 47 fps de média com CPU 4× mais lenta).

## Decisão

O pedaço do 3D **não é baixado** quando qualquer um destes for verdade (`decideScene`, em `src/features/scene3d/sceneGate.ts`, função pura com testes):

| Sinal | Corte | Motivo registrado |
|---|---|---|
| largura da janela | ≤ 760 px | `tela-estreita` |
| `navigator.connection.saveData` | `true` | `economia-de-dados` |
| `navigator.deviceMemory` | ≤ 4 GB | `pouca-memoria` |
| `navigator.hardwareConcurrency` | ≤ 4 núcleos | `poucos-nucleos` |
| `prefers-reduced-motion` | `reduce` | `movimento-reduzido` |
| WebGL com GPU | ausente | `sem-webgl` |

Sinal ausente não conta contra o aparelho: Safari e Firefox não informam `deviceMemory` nem `saveData`.

No lugar da cena entram **pôsteres estáticos da própria cena**, gerados por `npm run bake:posters` com o mesmo `sceneRig`, o mesmo reflexo e a mesma câmera, parados no tempo 0:

- a fita no topo e o colar no fim da página;
- em paisagem (desktop) e retrato (celular);
- WebP com fundo transparente, de 12 a 24 kB cada.

Prints em `img/posteres.jpg`.

- **Desenhados em `<canvas>`, não em `<img>`.** Uma imagem decorativa do tamanho da tela viraria o "maior elemento" e seria medida como LCP no lugar do título.
- **Entram depois do conteúdo e com fade**, no mesmo momento em que a cena ao vivo entraria.
- **No celular, a fita começa abaixo do H1.** Em 360px a ponta da fita cruzava a última linha do título; agora o título e o parágrafo ficam com 0% de sobreposição medida. Antes e depois em `img/h1-celular-antes-depois.jpg`.
- **Se a cena ao vivo falhar** (erro ou WebGL perdido), a página troca para os pôsteres.

## Verificação

- O `npm run check:layout` confere, pela lista de arquivos baixados pela página (o mesmo que a aba Network mostra), que celular, movimento reduzido e desktop com 4 núcleos **não baixam** `SceneCanvas-*.js` nem `envmap/`, e que o desktop forte mostra o 3D ao vivo.
- Contraprova: com a regra forçada a "ao vivo", o teste acusa o download no celular.

## Consequências

- **Notebooks com 4 núcleos lógicos recebem a versão estática**, mesmo com tela grande. Isso inclui a máquina de desenvolvimento do Richard: para ver o 3D ao vivo nela, use o DevTools (ver README) ou mude o corte para `< 4`.
- A decisão é tomada uma vez, ao abrir a página. Redimensionar a janela depois não troca de modo.
- Mudou a cena? Rode `npm run bake:posters` para os pôsteres acompanharem.
