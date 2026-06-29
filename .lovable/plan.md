## Problema

Monetização (Cross-sell/Upsell/Troca) só respeita o filtro de BU (`isConsolidado`). Quando o usuário filtra por um Closer específico (ex.: trocar de Mari Luz para outro), os cards de Monetização continuam aparecendo em Propostas/Vendas, porque a filtragem por Closer não está aplicada nesse fluxo.

## Mudança

Em `src/components/planning/IndicatorsTab.tsx`, sempre que incluirmos itens da Monetização, aplicar um filtro adicional baseado em `effectiveSelectedClosers` comparando com o campo `responsible` do item (Closer do card no pipe Monetização).

Como o pipe de Monetização não tem SDR, o filtro de SDR continua zerando a contribuição da Monetização (já que nenhum item tem SDR para casar). Se o usuário tiver SDR selecionado, removemos Monetização dos cálculos para manter consistência ("se filtrou por SDR específico, Monetização não conta").

Pontos a ajustar (4 locais que já consultam Monetização):
1. `calculateTotalForIndicator` (~linha 1180): contar apenas itens cujo `responsible` esteja em `effectiveSelectedClosers` (quando houver filtro), e zerar se houver `effectiveSelectedSDRs`.
2. `getItemsForIndicator` (~linha 1613): aplicar o mesmo filtro antes do spread.
3. Bloco de soma monetária (`monetizacaoVenda`, ~linha 2457): filtrar a lista por Closer/SDR antes de somar `mrr/setup/pontual`.
4. Criar helper local `getFilteredMonetizacaoItems(indicatorKey)` para evitar repetição e garantir regra única.

Normalização: usar a mesma normalização (`trim().toLowerCase()` + remover acentos) já padrão no projeto para casar `responsible` ↔ valores do filtro.

Nenhuma mudança em hooks, em outras BUs, ou em UI/labels.

## Resultado esperado

- Filtrando por Closer = "Mari Luz": só cards de Monetização com `responsavel` = Mari Luz aparecem.
- Filtrando por outro Closer: cards de Mari Luz somem.
- Filtrando por qualquer SDR: Monetização não contribui (pipe não tem SDR).
- Sem filtro de Closer/SDR e BU consolidado: comportamento atual preservado.
