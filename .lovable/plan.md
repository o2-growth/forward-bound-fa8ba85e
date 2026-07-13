# Fix: card "Viver" (Amanda) aparecendo em 🔥 Quente mesmo estando Frio no Pipefy

## Causa raiz
O hook `src/hooks/useModeloAtualAnalytics.ts` mantém uma lista sazonal `FORCED_QUENTE_TITLES` (linhas 153-170) que força certos títulos como 🔥 Quente **ignorando** o valor real do Pipefy. O título `'viver'` está nessa lista desde junho/2026.

Verificação no banco (card `1376121014` — "Viver", Amanda Teixeira Serafim):
- `Labels = 'Frio'` em todas as 8 linhas de movimento ✅
- `Prioridade do Lead` / `Prioridade Lead` vazios
- O parser `parseTemperatura` já lê `row['Labels']` como primeira opção, então removendo o forced ele cai corretamente em ❄ **Frio** — não em "Sem tag".

## Mudança
Arquivo: `src/hooks/useModeloAtualAnalytics.ts`

Remover apenas a linha `'viver',` do `FORCED_QUENTE_TITLES` (linha 159). Os outros 10 títulos de junho/2026 permanecem intocados (conforme sua escolha).

```diff
   // Quentes junho 2026
-  'viver',
   'rede sander',
   ...
```

## Impacto
- Card "Viver" da Amanda sai do chip 🔥 Quente e passa para ❄ Frio na seção "Temperatura dos Leads" e no Pace Comercial.
- Nenhum outro card é afetado.
- Nenhuma outra tela / hook / meta muda.

## Arquivo alterado
- `src/hooks/useModeloAtualAnalytics.ts` (1 linha removida)
