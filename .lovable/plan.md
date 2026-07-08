## Diagnóstico

A alteração anterior foi no arquivo errado (`ClickableFunnelChart.tsx`). O drill-down "Vendas - Análise de Valor (TCV)" que abre pelo velocímetro vem de `src/components/planning/IndicatorsTab.tsx` case `'venda'` (linhas ~2280-2450).

## Alteração

Em `src/components/planning/IndicatorsTab.tsx`, dentro do case `'venda'`:

1. **KPI Faturamento (ARPU)** entre Pontual e TCV:
   - `{ icon: '💰', value: formatCompactCurrency(totalMrr + totalSetup + totalPontual), label: 'Faturamento (ARPU)', highlight: 'success' }`

2. **Descrição** — incluir `Faturamento: R$ X` antes de TCV.

3. **Coluna nova** entre Pontual e TCV (linha ~2445):
   - `{ key: 'faturamento', label: 'Faturamento', format: columnFormatters.currency }`
   - Preencher em `itemsWithTCV.map`: `faturamento: (item.mrr||0) + (item.setup||0) + (item.pontual||0)`.

`DetailItem.faturamento` já foi adicionado no passo anterior.

Escopo restrito ao case `'venda'` — TCV, ciclo e demais métricas continuam iguais.
