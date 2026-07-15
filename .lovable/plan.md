## Objetivo
Forçar o card Pipefy `1064873254` a ser classificado como **Monetização** no filtro de origem, independente dos campos de origem preenchidos no Pipefy.

## Alteração
**Arquivo:** `src/lib/leadSource.ts`

1. Adicionar `id?: string | null` (ou `cardId`) ao `ClassifyInput`.
2. Criar um `Set<string>` no topo do arquivo:
   ```ts
   const MONETIZACAO_HARDCODED_IDS = new Set(['1064873254']);
   ```
3. Na regra 0 (topo de `classifyLeadSource`), antes de qualquer outra checagem:
   ```ts
   if (c.id && MONETIZACAO_HARDCODED_IDS.has(String(c.id))) return 'monetizacao';
   ```

## Propagação do `id`
Passar `id: item.id` (ou equivalente) nas 3 chamadas existentes de `classifyLeadSource`:
- `src/components/planning/IndicatorsTab.tsx` — `matchesOrigemFilter` (~L987) e `classifyItem` (~L2065)
- `src/components/planning/ClickableFunnelChart.tsx` — `matchCardOrigem` (~L67)

## Impacto
- Só esse card é afetado. Nenhuma outra regra muda.
- Fácil de estender: basta adicionar novos IDs ao `Set`.
- Risco: nenhum — override explícito por ID.

## O que resolve
O card `1064873254` aparecerá no filtro "Monetização" mesmo que os campos `tipoOrigem`, `origemLead`, `bu`, `tipoMovimentacao` não tenham os valores esperados no Pipefy.
