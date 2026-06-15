## Problema

No painel **Pace Comercial** (aberto via botão), as chips de closer são montadas apenas a partir dos itens reais do período (`itemsByIndicator` + `hotOpportunityItems`). Se um closer não teve nenhum item naquele recorte de BU + datas, ele não aparece como opção — foi o que aconteceu com o **Daniel Trindade** ao filtrar só **Oxy Hacker + Franquia**.

A correção no `BU_CLOSERS` (Daniel adicionado em todas as BUs) só afeta o filtro do `IndicatorsTab`. O Pace tem sua própria lógica de chips.

## Mudança

Arquivo: `src/components/planning/indicators/CommercialPaceDashboard.tsx`

1. Importar `BU_CLOSERS, BuType` de `@/hooks/useCloserMetas`.
2. Dentro do `useMemo` que monta `closers` (linha 112), **antes** de iterar pelos itens, fazer seed do `map` com um `CloserAgg` vazio (zeros) para cada closer presente em `BU_CLOSERS[bu]` para cada `bu` em `selectedBUs`. Reutilizar a função `ensure(name)` já existente.
3. Manter o filtro atual em `filterItems` (linha 325-328) que exclui `__none__` / `sem closer` — closers seedados sem nome inválido continuam aparecendo.

Resultado: ao selecionar Oxy Hacker e/ou Franquia, o Daniel Trindade sempre aparece como chip (mesmo que zerado), permitindo selecioná-lo. O mesmo vale para qualquer outro closer atribuído à BU que ainda não tenha movimentação no período.

## Fora de escopo

- Lógica do `IndicatorsTab` (já corrigida no turno anterior).
- Metas / faturamento: o seed só adiciona o closer ao mapa; a meta dele continua sendo calculada por `getMonthlyMap(agg.name)` normalmente.
