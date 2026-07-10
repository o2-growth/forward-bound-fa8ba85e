## Causa raiz (Francisco Carlos, ID 1367018386)

Card entrou várias vezes em RR em julho, alternando `Produtos`:

| Entrada | Fase | Produtos |
|---|---|---|
| 2026-07-01 19:42 | Reunião Realizada | Franquia |
| 2026-07-02 20:19 | Reunião Realizada | Oxy Hacker |
| 2026-07-06 20:46 | Reunião Realizada | Oxy Hacker |

Produto atual do card hoje: **Oxy Hacker** (linha mais recente / `Fase Atual` = Contrato em elaboração, Produtos = Oxy Hacker).

`useExpansaoMetas` (Franquia) e `useOxyHackerMetas` filtram por produto no início e dedupam só por `cardId` dentro do próprio produto → Francisco cai em Franquia (via 07-01) e em Oxy Hacker (via 07-02/06). Consolidado duplica. Mesmo problema em RM.

O `useExpansaoAnalytics` já foi corrigido antes, mas usa "earliest entry vence" — pela regra nova do usuário, também está errado (colocaria em Franquia, não no produto atual).

## Regra correta

Um card conta **1x por mês por indicador**, atribuído ao **produto atual do card** (`Produtos` da linha mais recente / `Fase Atual`), independente de em qual produto ele estava quando entrou nas fases.

## Correção

Aplicar em três hooks: `useExpansaoAnalytics.ts`, `useExpansaoMetas.ts`, `useOxyHackerMetas.ts`.

1. **Determinar produto atual por cardId** (uma vez, cross-product):
   - Varrer todas as linhas cross-product.
   - Para cada `cardId`, escolher a linha com `Entrada` (ou `updated_at` como fallback) mais recente → `currentProdutoByCard.set(cardId, produto)`.

2. **Dedup por `cardId__indicator__YYYY-MM`** (como já existe no analytics), mas na hora de filtrar por produto do hook, comparar contra `currentProdutoByCard.get(cardId)` em vez de `entry.produto`.

3. Aplicar a mesma regra em:
   - `useExpansaoAnalytics.getCardsForIndicator` (leads, mql, rm, rr, proposta, venda)
   - `useExpansaoMetas.getQtyForPeriod`, `getValueForPeriod`, `getGroupedData`, `getDetailItemsForIndicator`
   - `useOxyHackerMetas.getQtyForPeriod`, `getValueForPeriod`, `getGroupedData`, `getDetailItemsForIndicator`

4. Nos metas hooks, remover o `if (produto !== 'Franquia') continue` do parse inicial — precisamos das linhas de todos os produtos para calcular `currentProdutoByCard`. O filtro por produto passa a acontecer no consumo, via `currentProdutoByCard.get(cardId) === PRODUTO_DO_HOOK`.

## Efeito esperado

- Francisco Carlos (produto atual = Oxy Hacker) some da lista de Franquia RR e RM de julho. Conta 1x em Oxy Hacker RR e 1x em Oxy Hacker RM. Consolidado = 1x cada.
- Regra vale para todos os cards que trocaram de produto durante o funil.
- Gauges e drill-down consolidado ficam consistentes.
