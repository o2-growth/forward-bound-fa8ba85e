## Correção aplicada — atribuição por produto ATUAL

Cada card em Expansão passa a contar 1x por mês/indicador, atribuído ao **produto da linha mais recente** (última `Entrada` do card). Cards que trocaram de produto (ex.: Francisco Carlos, Franquia → Oxy Hacker) não duplicam mais no consolidado.

### Arquivos alterados

- `src/hooks/useExpansaoAnalytics.ts` — novo `currentProdutoByCard`; `getCardsForIndicator` filtra por `currentProdutoByCard.get(id).produto === produto` (em vez de `entry.produto`).
- `src/hooks/useExpansaoMetas.ts` — removido filtro `produto !== 'Franquia'` no parse; novo `currentProdutoByCard` + `isCurrentProduct(id)` aplicado em `getQtyForPeriod`, `getValueForPeriod`, `getGroupedData` e `getDetailItemsForIndicator`.
- `src/hooks/useOxyHackerMetas.ts` — mesma mudança para `'Oxy Hacker'`.

### Efeito para Francisco Carlos (ID 1367018386, julho/2026)

- Produto atual = **Oxy Hacker** (última linha).
- Franquia RR/RM: **0x** (antes: 1x).
- Oxy Hacker RR/RM: **1x** (antes: 1x deduplicado, mas cross-product duplicava).
- Consolidado: **1x** em RR e **1x** em RM.
