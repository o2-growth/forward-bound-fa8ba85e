## Por que ainda há 54% em "Não informado"

Investigando mais a fundo, descobri a causa real:

### Causa raiz (confirmada)

No parser dos hooks (`parseCardRow`), a fase **'Perdido' NÃO está em `PHASE_TO_INDICATOR`**. Por isso, quando chamamos `parseCards(rows)` (sem `skipPhaseFilter`), todas as linhas de movimento onde `fase === 'Perdido'` são **descartadas**:

```ts
// useModeloAtualAnalytics.ts linha 127
if (!skipPhaseFilter && !PHASE_TO_INDICATOR[fase]) return null;
```

Como o Pipefy só preenche "Motivo da perda" justamente na linha em que o card entrou em "Perdido", o array `cards` (usado pelo meu fix anterior) **nunca contém** essa linha. Resultado: meu backfill que varria `cards` procurando `fase === 'Perdido'` nunca achava nada.

### O hook já carrega esses dados — só não estávamos usando

O hook `useModeloAtualAnalytics` já expõe três outras fontes que **contêm** as linhas de Perdido:
- `allCards` (`allCardsUnfiltered`) — todas as fases, período por Entrada
- `fullHistory` — histórico completo dos cards do período
- `mqlByCreation` — cards criados no período (qualquer fase, inclui Perdido)

### Correção

Em `getLostDeals` dos três hooks (`useModeloAtualAnalytics`, `useO2TaxAnalytics`, `useExpansaoAnalytics`):

1. Construir o mapa `motivoByCardId` varrendo **todas** as fontes disponíveis (`cards + allCards + fullHistory + mqlByCreation`), priorizando linhas com `fase === 'Perdido' && motivoPerda`.
2. Selecionar a linha representativa do card perdido também a partir dessas fontes (não apenas de `cards`), preferindo a linha `fase === 'Perdido'`.
3. Preencher `motivoPerda` no card final usando o mapa quando estiver vazio.

Adicionalmente, preciso confirmar que `useO2TaxAnalytics` e `useExpansaoAnalytics` também expõem `allCards`/`fullHistory`. Se não expuserem internamente, vou usar apenas `cards` + qualquer outra fonte já disponível dentro de cada hook (todos têm pelo menos `mqlByCreation` ou equivalente).

### Arquivos a alterar

- `src/hooks/useModeloAtualAnalytics.ts` — usar `allCards`, `fullHistory`, `mqlByCreation` no `getLostDeals`
- `src/hooks/useO2TaxAnalytics.ts` — mesmo ajuste, com as fontes equivalentes
- `src/hooks/useExpansaoAnalytics.ts` — mesmo ajuste, com as fontes equivalentes

Sem alterações de UI, banco ou edge functions.

### Resultado esperado

A fatia "Não informado" deve cair para a quantidade real de cards que foram para "Perdido" sem nenhum motivo registrado no Pipefy (geralmente algo entre 0% e 15%, não 54%).