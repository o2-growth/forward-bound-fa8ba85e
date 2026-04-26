
## Bug confirmado

A função `buildExcludedMqlCardIds` em `src/hooks/useModeloAtualMetas.ts` (linhas 80-88) **exclui o card se QUALQUER linha histórica** de movimentação tiver um motivo de perda na lista. Isso quebra o caso "motivo removido":

- Card foi marcado como "Duplicado" no Pipefy → várias linhas de `pipefy_moviment_*` foram gravadas com `"Motivo da perda" = 'Duplicado'`.
- Hoje o usuário **remove o motivo no Pipefy** (campo fica vazio) → novas movimentações vêm sem motivo, **mas as antigas continuam com 'Duplicado'**.
- Resultado: `buildExcludedMqlCardIds` continua achando "Duplicado" no histórico → card permanece excluído pra sempre. ❌

## Comportamento desejado

A exclusão deve refletir o **estado atual** do card. Se o motivo foi removido (ou trocado pra um motivo que não exclui), o card **volta a contar como MQL**.

## Solução

Reescrever `buildExcludedMqlCardIds` pra olhar apenas o **motivo da movimentação mais recente** de cada card, não todas as linhas.

### Mudança 1 — `src/hooks/useModeloAtualMetas.ts` (linhas 78-88)

Atualizar a assinatura para aceitar `dataEntrada` e usar a movimentação mais recente por card:

```ts
export function buildExcludedMqlCardIds(
  rows: Array<{ id: string; motivoPerda?: string; dataEntrada?: Date }>
): Set<string> {
  // Pega a linha mais recente de cada card (por dataEntrada).
  // Se não houver dataEntrada, usa a última ocorrência na ordem do array.
  const latestByCard = new Map<string, { motivoPerda?: string; ts: number }>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ts = row.dataEntrada ? row.dataEntrada.getTime() : i;
    const current = latestByCard.get(row.id);
    if (!current || ts >= current.ts) {
      latestByCard.set(row.id, { motivoPerda: row.motivoPerda, ts });
    }
  }

  const excluded = new Set<string>();
  for (const [id, info] of latestByCard) {
    if (info.motivoPerda && isMqlExcludedByLoss(undefined, info.motivoPerda)) {
      excluded.add(id);
    }
  }
  return excluded;
}
```

**Lógica:** se o motivo "atual" (última linha) está vazio ou fora da lista de excluídos, o card **não** é excluído — mesmo que já tenha tido um motivo excluído no passado.

### Mudança 2 — Call sites passam `dataEntrada`

Os 4 call sites já têm `dataEntrada` nos objetos `mqlByCreation` / movimentos. Basta incluir o campo no map:

1. **`src/hooks/useModeloAtualMetas.ts` linha 370** — `buildExcludedMqlCardIds(mqlByCreation)` já passa objetos com `dataEntrada`. Sem mudança extra (a nova função aceita o campo opcional).

2. **`src/hooks/useModeloAtualAnalytics.ts` linha 360** — idem, `mqlByCreation` já tem `dataEntrada`.

3. **`src/hooks/useO2TaxAnalytics.ts` linha 274-276** — atualizar:
   ```ts
   buildExcludedMqlCardIds(
     historyToUse.map(c => ({ id: c.id, motivoPerda: c.motivoPerda || undefined, dataEntrada: c.dataEntrada }))
   )
   ```

4. **`src/hooks/useIndicatorsRealized.ts` linha 209** — atualizar a tipagem `MqlCreation` (linha 190) pra incluir `dataEntrada` (já vem de `row['Entrada']`) e propagar na linha 199.

### Mudança 3 — Ajuste no check inline

`src/hooks/useModeloAtualAnalytics.ts` linha 563:
```ts
return cardIndicator === 'mql' && isMqlQualified(m.faixa) && !isMqlExcludedByLoss(m.faseAtual, m.motivoPerda);
```

Esse check está dentro de um loop por movimento individual. Aqui também é histórico — vou trocar pra consultar `excludedMqlIds.has(m.id)` (que já é card-level com a nova lógica), garantindo consistência.

### Mudança 4 — Diagnóstico no Edge Function

`supabase/functions/query-external-db/index.ts` linhas 415-437 (action `mql_diagnosis`) usa `array_agg(DISTINCT "Motivo da perda")` — também olha histórico inteiro. Trocar pra pegar o motivo da **última movimentação por card** via subquery `DISTINCT ON (ID) ... ORDER BY ID, "Entrada" DESC` ou window function. Isso garante que a aba de diagnóstico admin mostre o mesmo número que o dashboard.

## Garantias

- ✅ Card com motivo "Duplicado" removido **volta a contar** como MQL no próximo refresh.
- ✅ Card que **agora** tem motivo excluído continua sendo excluído.
- ✅ Card que mudou de motivo excluído pra outro motivo excluído continua excluído.
- ✅ Aplica-se a Modelo Atual, O2 TAX e qualquer BU que use `buildExcludedMqlCardIds`.
- ✅ Sem mudança de schema, sem nova chamada de API.
- ✅ Aba de diagnóstico admin (`mql_diagnosis`) fica consistente com o dashboard.

## Memória a atualizar

`mem://logic/indicators/mql-liquidity-deduction-rules` — adicionar nota: "Exclusão usa motivo da movimentação MAIS RECENTE do card; se removido no Pipefy, card volta a contar."

## Fora de escopo

- Lista de motivos excluídos (`MQL_EXCLUDED_LOSS_REASONS`) — sem mudança.
- Cards de teste e thresholds de faturamento — sem mudança.
- Build errors pré-existentes (`manage-user/index.ts` linha 288, `OperationsSection.tsx` linha 748) — não relacionados a este bug; não vou tocar a menos que você peça.
