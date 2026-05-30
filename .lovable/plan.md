## Problema

Os 5 acelerômetros monetários no final do dashboard (SLA, Faturamento, MRR, Setup, Pontual) ignoram o filtro de **Origem** (Outbound, Inbound, etc.). Quando o usuário seleciona somente uma origem (sem filtrar Closer ou SDR), os cards mostram o valor total da BU.

## Causa

Em `src/components/planning/IndicatorsTab.tsx`, dentro de `getRealizedMonetaryForIndicator` (linha ~2332), o flag `filtersActive` considera apenas Closer e SDR:

```ts
const filtersActive = closerFilterActive || sdrFilterActive;
```

Quando `filtersActive` é `false`, a função cai no caminho otimizado (`getModeloAtualValue`, `getMrrForPeriod`, `getSetupForPeriod`, `getPontualForPeriod`, `getOxyHackerValue`, `getExpansaoValue`) — esses helpers vêm do hook de realized agregado e não aplicam `matchesOrigemFilter`.

A função `filteredVendasForBU` (que aplica `matchesOrigemFilter` por card) só é executada quando o filtro de pessoas está ativo.

## Correção

Em `src/components/planning/IndicatorsTab.tsx`:

1. Adicionar `origemFilterActive` no escopo de `getRealizedMonetaryForIndicator`:
   ```ts
   const origemFilterActive = selectedOrigens.length > 0;
   const filtersActive = closerFilterActive || sdrFilterActive || origemFilterActive;
   ```
2. Manter `filteredVendasForBU` igual (já chama `matchesOrigemFilter`).
3. Resultado: quando só Origem estiver selecionada, o caminho `filtered === null` deixa de ser usado, e todas as 4 BUs (Modelo Atual, O2 TAX, Oxy Hacker, Franquia) somam apenas os cards de venda cuja origem classificada está no filtro — para Faturamento, MRR, Setup e Pontual.

## Observações

- **SLA** continua sem aplicar origem (é uma métrica de fase/tempo de leads em "Tentativas de contato", não venda); manter como está.
- **Meta** dos acelerômetros (`getMetaMonetaryForIndicator`) não muda: meta é absoluta do período/BU e não tem origem.
- Nenhuma mudança em outros componentes, hooks, schema ou cálculos. Apenas um ajuste de 2 linhas dentro de uma função.