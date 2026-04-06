
Objetivo: destravar o build corrigindo os 2 erros reais que estão impedindo o preview de subir.

1. Corrigir a redeclaração em `src/components/planning/IndicatorsTab.tsx`
- No hook `useFunnelRealized(...)`, renomear o destructuring de:
  - `data: funnelData`
  para:
  - `data: funnelRawData`
- Atualizar o `useMemo` de `lastUpdated` para usar `funnelRawData`.
- Manter intacto o `const { funnelData, metasPorBU } = useMediaMetas();` porque esse é o objeto usado no restante do componente (`modeloAtual`, `o2Tax`, `oxyHacker`, `franquia`).

2. Garantir que o restante do componente continue apontando para o `funnelData` correto
- Não trocar os acessos da faixa ~718+ (`funnelData.modeloAtual`, `funnelData.o2Tax`, etc.).
- Esses acessos devem continuar usando apenas o `funnelData` vindo de `useMediaMetas()`.
- Isso elimina os erros de tipo como:
  - `Property 'modeloAtual' does not exist on type 'FunnelRealizedRecord[]'`

3. Corrigir o erro de CSS que também quebra o build
- Em `src/index.css`, mover o `@import url(...)` para o topo absoluto do arquivo.
- A ordem deve ficar:
```text
@import ...
@tailwind base;
@tailwind components;
@tailwind utilities;
```
- O Vite está falhando porque `@import` não pode vir depois dos `@tailwind`.

4. Resultado esperado
- O erro `Cannot redeclare block-scoped variable 'funnelData'` desaparece.
- Os erros de `funnelData.modeloAtual/o2Tax/...` desaparecem.
- O erro de CSS do `@import must precede all other statements` desaparece.
- O preview volta a compilar e a tela branca some.

Detalhes técnicos
- Causa principal do TS:
  - `useFunnelRealized` retorna `FunnelRealizedRecord[]`
  - `useMediaMetas` retorna `FunnelDataByBU`
  - ambas estavam usando o mesmo nome local `funnelData`
- Causa do CSS:
  - o parser do Vite/PostCSS exige `@import` antes de qualquer outra regra não permitida

Arquivos a ajustar
- `src/components/planning/IndicatorsTab.tsx`
- `src/index.css`
