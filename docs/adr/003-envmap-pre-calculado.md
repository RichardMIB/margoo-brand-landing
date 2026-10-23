# ADR 003 — Reflexo de ambiente pré-calculado no build

- **Status:** aceito (22/10/2026, Fase 4, issue #4)
- **Decisão de:** Richard, a partir das medições em `docs/performance.md`

## Contexto

O cetim da fita e as pérolas usam `MeshPhysicalMaterial` (sheen, clearcoat, iridescência), que precisam de um reflexo de ambiente. O protótipo gerava esse reflexo no navegador: `PMREMGenerator.fromScene(new RoomEnvironment(), 0.04)`.

Medido com GPU real e CPU 4× mais lenta: a geração travava a thread principal por **2,2–2,5 s**. O custo é compilar os shaders internos do PMREM, de forma síncrona e não paralelizável pela API pública, e não depende da resolução (32 custava o mesmo que 128). No Lighthouse, isso virava ~9 s de TBT e empurrava o LCP 38% para cima.

O resultado do PMREM é sempre o mesmo para a mesma versão do three. Não há motivo para calculá-lo em cada visita.

## Decisão

Gerar o PMREM **uma vez**, no build, e versionar o resultado no git:

- `npm run bake:env` (`scripts/bake-envmap.mjs`) abre o Chrome headless com GPU, roda exatamente a mesma chamada do PMREM (página auxiliar `scripts/bake-envmap.html`), lê os pixels (half float, layout CubeUV) e grava:
  - `public/envmap/room-128.rgbe.bin`: RGBE 8 bits + filtro Paeth + gzip, **100 kB**;
  - `src/features/scene3d/envmap.json`: versão do three usada, dimensões, parâmetros do PMREM, tamanho e sha256.
- Na página (`src/features/scene3d/environment.ts`):
  1. baixa o arquivo;
  2. descomprime com `DecompressionStream`;
  3. decodifica com `envmapCodec.ts` (funções puras, testadas);
  4. monta uma `DataTexture` half float com `mapping = CubeUVReflectionMapping`.

  O three usa texturas CubeUV como estão (`WebGLEnvironments` só converte equiretangular e cubemap), então nenhum shader extra é compilado.
- **Reserva:** se o arquivo falhar ou não houver `DecompressionStream` (Safari < 16.4), o PMREM é gerado ao vivo com os mesmos parâmetros. O visual é o mesmo, só mais lento.

## Formato e resolução (medidos pelo próprio script)

| CubeUV | Formato | Tamanho (gzip) | Erro máx. |
|---|---|---|---|
| 64 | half float RGBA | 110 kB | exato |
| 64 | RGBE em PNG | 36 kB | 0,39% |
| 64 | RGBE + Paeth (escolhido) | 46 kB | 0,39% |
| 64 | RGBM em PNG | 24 kB | 3,25% |
| 128 | half float RGBA | 334 kB | exato |
| 128 | RGBE em PNG | 92 kB | 0,39% |
| **128** | **RGBE + Paeth (escolhido)** | **100 kB** | **0,39%** |
| 128 | RGBM em PNG | 52 kB | 4,33% |

- **RGBE, não RGBM:** o pico de brilho do ambiente é 43. O RGBM precisa de um alcance fixo, e com alcance 43 sobra pouca precisão nas áreas escuras (até 4% de erro). O RGBE tem expoente por pixel e erra no máximo 0,39%.
- **Paeth + gzip, não PNG:** o PNG ficaria ~10% menor, mas decodificar PNG no navegador sem estragar o alfa (onde fica o expoente) exigiria um decodificador próprio. O canvas pré-multiplica o alfa. O filtro Paeth é o mesmo do PNG, em 30 linhas testadas.
- **128, não 64:** em comparação de pixels com o PMREM padrão ao vivo (256, o visual aprovado no protótipo), com a cena parada nas mesmas posições:
  - **64:** diferença máxima de 17/255. O brilho do verniz no cetim fica visivelmente mais suave no zoom.
  - **128:** diferença máxima de 9/255, imperceptível no tamanho real.
  - **256 pré-calculado:** ~400 kB, acima do limite de 150 kB.

  Prints em `docs/adr/img/` (`envmap-topo|meio|colar.jpg`: 256 ao vivo à esquerda, 128 pré-calculado à direita; `envmap-zoom-256-64-128.jpg`: zoom de 3× no ponto mais diferente).

## Consequências

- **Precisa ser regerado ao atualizar o three.** O layout CubeUV e o RoomEnvironment podem mudar entre versões. O teste `src/features/scene3d/envmap.test.ts` falha se a versão do three no `package.json`, ou a instalada, for diferente da gravada no `envmap.json`, ou se o arquivo não bater com o sha256. Correção: `npm run bake:env` e commit de `public/envmap/` + `envmap.json`.
- O bake precisa de um Chrome com WebGL2. Com WebGL por software, funciona do mesmo jeito, só mais devagar.
- +100 kB baixados depois do LCP, junto com o pedaço do 3D, e só por quem vê a cena.
- Mudar os parâmetros do ambiente (sigma, tamanho) é feito no script, não no componente.
