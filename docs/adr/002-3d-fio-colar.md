# ADR 002 — Cena 3D "Fio + colar"

- **Status:** aceito (protótipo aprovado; implementado na Fase 4, 22/10/2026)

## Contexto

O protótipo testou modos de cena. O aprovado foi **"Fio + colar"**: uma fita de cetim caramelo atravessa a página e gira com o scroll, e 25 pérolas espalhadas se juntam num colar em U no fim, por baixo do título "Cada detalhe conta.". O modo `'hero'` e o painel `.proto` de testes foram descartados.

## Decisão

- **Um só motor de animação.** `src/features/motion/scrollEngine.ts` é o único dono do `requestAnimationFrame`. O R3F roda com `frameloop="never"`, e a cena se registra no motor quando o carregamento lazy termina, chamando `advance()` a cada quadro. O motor funciona sem a cena (celular, sem WebGL, erro).
- **Coreografia em funções puras com testes:**
  - `ribbon.ts`: `ribbonAt`, a forma da fita copiada do protótipo;
  - `choreography.ts`: pose por progresso da página, vento pela velocidade do scroll, colar em U recalculado pela largura visível;
  - `sceneRig.ts`: materiais, luzes e pose do quadro, compartilhados entre a cena ao vivo e os pôsteres estáticos.
- **Suavização por tempo real:** `damp(k, dt) = 1 − (1 − k)^(dt·60)`. 60 Hz e 120 Hz chegam ao mesmo valor no mesmo tempo, e há teste para isso.
- **Materiais:** `MeshPhysicalMaterial` com sheen e clearcoat (cetim) e com iridescência (pérolas), sobre o reflexo do `RoomEnvironment`. Pérolas em `InstancedMesh`: 1 chamada de desenho em vez de 25.
- **Largada sem travar a página** (medições em `docs/performance.md`):
  - a cena só começa depois de `load`, fontes, primeiro LCP e um momento ocioso;
  - os shaders compilam em paralelo (`compileAsync`);
  - o reflexo vem pré-calculado do build (ADR 003);
  - sem GPU, a cena não carrega (`failIfMajorPerformanceCaveat`).
- **Robustez:** a cena pausa com a aba oculta, libera recursos ao desmontar e trata `webglcontextlost`, trocando para os pôsteres. Com movimento reduzido ela não carrega (ADR 004).

## Consequências

- O pedaço do 3D (three + R3F) tem ~245 kB gzip, mais 100 kB do reflexo. Só desktop forte baixa (ADR 004).
- Mudou a cena (materiais, luzes, coreografia)? Rode `npm run bake:posters` para os pôsteres continuarem iguais à cena ao vivo.
