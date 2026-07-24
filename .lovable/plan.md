## Problema
"Tchau Entrega" aparece como venda em duas lives no `/dash-g4`. Isso ocorre porque `lead.lives` contém múltiplas lives assistidas — em `buildGroups` (linhas 196-200 de `G4ConsolidatedDashboard.tsx`) o lead é adicionado a **cada** live, e depois `won = uniq.filter(isG4Sale)` conta a venda uma vez por grupo.

## Solução
Antes do loop que distribui o lead entre lives, se o lead é uma venda G4 (`isG4Sale`), reduzir `lives` a **apenas uma live** — a mais próxima (em valor absoluto de dias) da `dataGanho`. Não-vendas continuam contadas em todas as lives que participaram (comportamento atual do funil).

## Alterações
`src/components/planning/g4/G4ConsolidatedDashboard.tsx`, dentro de `buildGroups` (linhas ~188-201):

1. Para cada lead, se `isG4Sale(lead)` e `lead.lives.length > 1` e `lead.dataGanho` estiver disponível:
   - Parsear cada live via `parseEventDate` (já importada de `canonLive.ts`).
   - Selecionar a live cuja data tenha menor `|liveDate - dataGanho|`.
   - Lives sem data parseável são desempate/última opção.
   - Usar `[liveEscolhida]` no lugar de `lead.lives`.
2. Se `dataGanho` for null, manter fallback: usar apenas a **última** live do array (mais recente cronologicamente).
3. Não alterar lógica para leads que não são vendas.

## Validação
- Recarregar `/dash-g4` e conferir que Tchau Entrega aparece em apenas uma live (a mais próxima da data de ganho).
- Total de vendas cai de duplicadas para 1 por cliente da whitelist.
- Outras vendas (Martinelli, Petromar, etc.) continuam alocadas corretamente.