## Objetivo
Liberar o mês corrente (hoje = maio/2026) para edição no Plan Growth — tanto na **Configuração de Indicadores BU** (CPV, MQL→RM, RM→RR, RR→Prop, Prop→Venda, Ticket Médio) quanto na coluna **A Vender** da grade mensal.

## Diagnóstico
A trava existe em **dois pontos** (não no banco — `funnel_metas.is_locked` está `false` para maio):

1. `src/hooks/useBUIndicatorsConfig.ts` — função `isMonthLocked` retorna `true` para o mês atual:
   ```ts
   return monthIdx <= currentMonthIdx; // bloqueia atual + passados
   ```
   Isso desabilita os 5 inputs de indicadores e a UI mostra o cadeado 🔒.

2. `src/components/planning/MediaInvestmentTab.tsx` linha 421 — `isMonthEditable`:
   ```ts
   return monthIndex >= currentMonthIndex; // já permite o mês atual
   ```
   Esta regra **já libera** maio para A Vender. A regra do `useBUIndicatorsConfig` é a que está fechando tudo.

## Mudança proposta
Trocar a regra em `useBUIndicatorsConfig.isMonthLocked` para travar **apenas meses passados**, não o atual:

```ts
return monthIdx < currentMonthIdx; // só passados ficam locked
```

Efeitos:
- Maio passa a aparecer sem 🔒 no seletor de mês da Configuração de Indicadores.
- Os inputs (CPV, conversões, Ticket Médio) ficam editáveis.
- O botão "Salvar" aceita maio (a validação `allowed` no `saveMutation` deixa passar).
- A grade A Vender já permitia maio — sem mudança ali.
- Snapshot `is_locked` no banco para maio segue `false`, então `usePlanGrowthData` continua usando os valores ao vivo (Oxy real + cálculos), sem conflito.

## Fora de escopo
- Não alterar `funnel_metas.is_locked` no banco (snapshot) — o usuário escolheu apenas a UI.
- Não alterar metas monetárias passadas nem regras de bloqueio do snapshot do mês fechado.
- Não mexer no fluxo de salvar do MediaInvestmentTab além do que a mudança acima já habilita naturalmente.

## Detalhes técnicos
**Arquivo:** `src/hooks/useBUIndicatorsConfig.ts` (linha 37)
- Mudar `<=` para `<` na função `isMonthLocked`.
- Atualizar o JSDoc da linha 31 para refletir "is in the past" (sem incluir o atual).

**Verificação após implementar:**
- Abrir Plan Growth → Configuração de Indicadores BU → escolher Maio: confirmar que não tem cadeado, inputs ficam ativos e o botão Salvar habilita.
- Abrir grade A Vender: confirmar que coluna Mai continua editável (já estava).
- Confirmar que Abr e meses anteriores seguem travados com 🔒.
