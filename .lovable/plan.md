## Objetivo

Garantir que um card seja contado como **MQL** sempre que o **faturamento** atinja o threshold da BU (≥ R$ 200k Modelo Atual, ≥ R$ 500k O2 TAX) e tenha sido **criado no período**, sem depender da fase em que está hoje (pode estar em "Novos Leads", "Start form", "Tentativas de contato", "RM", "Proposta", "Ganho", etc.). Continuam excluídos apenas: cards de teste e cards com motivo de perda na lista de exclusão de MQL (Duplicado, Pessoa física fora do ICP, etc.).

## Diagnóstico

Hoje os contadores principais (`getCardsForIndicator('mql')`, `getQtyForPeriod('mql')`, `countForWindow`, `getRawMqlCount`) já usam a regra correta: data de criação + `isMqlQualified(faixa)` — sem checar fase.

Mas o **drilldown em cohort mode** ainda exige que o card tenha entrado fisicamente na fase MQL/Start form:

- `src/hooks/useModeloAtualAnalytics.ts` linha ~721: `cardIndicator === 'mql' && isMqlQualified(...)` → exige passagem pela fase MQLs.
- `src/hooks/useO2TaxAnalytics.ts` linhas ~752-762: `movementIndicator === indicator` (cai no fallback) → exige passagem pela fase MQL.

Isso explica por que cards com faturamento qualificado aparecem em alguns números mas somem da lista quando o usuário clica para ver detalhes (cohort).

## Mudanças

### 1. `src/hooks/useModeloAtualAnalytics.ts` — `getDetailItemsWithFullHistory`
Substituir o ramo `if (indicator === 'mql')` por lógica que:
- Itera `mqlByCreation` (já trazido sem filtro de fase pela query `query_period_by_creation`).
- Inclui o card se: `dataCriacao ∈ [startTime, endTime]` **E** `isMqlQualified(card.faixa)` **E** `!isTestCard(card.id)` **E** `!excludedMqlIds.has(card.id)`.
- Dedup por `card.id`, mapeia para `DetailItem` (mesma rotina `toDetailItem`).
- Mantém comportamento atual para os demais indicadores.

### 2. `src/hooks/useO2TaxAnalytics.ts` — `getDetailItemsWithFullHistory`
Adicionar antes do `find()`:
- Se `indicator === 'mql'`: iterar `mqlByCreation` com regra equivalente (`dataCriacao` no período, `isO2TaxMqlQualified(card.faixa)`, `!excludedMqlIds.has(card.id)`, sem `isTestCard` se a hook não usa; manter consistência com `getCardsForIndicator('mql')`), retornar `DetailItem[]` dedup por id.
- Demais indicadores seguem inalterados.

### 3. Validação rápida (manual no preview)
- Filtrar período do mês atual em Modelo Atual: número do card "MQL" no topo deve bater com a contagem do drilldown.
- Idem O2 TAX.
- Conferir um card conhecido que esteja em "Novos Leads"/"Tentativas de contato" com faturamento ≥ threshold: agora deve aparecer na lista do drilldown MQL.

## Fora do escopo

- Expansão (threshold R$ 15k) — não alterar, conforme resposta do usuário.
- Demais hooks (`useModeloAtualMetas`, `useO2TaxMetas`) — já estão corretos, sem mudanças.
- Regras de exclusão por motivo de perda — preservadas.
