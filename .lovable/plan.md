## Objetivo

No drill-down "Vendas - Análise de Valor" adicionar a métrica **Faturamento (ARPU)** = MRR + Setup + Pontual (distinta do TCV que usa MRR×12).

## Alterações em `src/components/planning/ClickableFunnelChart.tsx` (buildVendaMiniDashboard)

1. **KPI novo** no topo, antes do TCV:
   - `{ icon: '💰', value: formatCompactCurrency(totalMRR + totalSetup + totalPontual), label: 'Faturamento (ARPU)', highlight: 'success' }`

2. **Descrição do drawer** — incluir Faturamento total:
   - `... | Faturamento: R$ X | TCV: R$ Y | ...`

3. **Coluna nova na tabela** entre Pontual e TCV:
   - `{ key: 'faturamento', label: 'Faturamento', format: columnFormatters.currency }`
   - Preencher em `itemsWithTCV`: `faturamento: (item.mrr||0) + (item.setup||0) + (item.pontual||0)`
   - Adicionar `faturamento?: number` em `DetailItem` (`src/components/planning/indicators/DetailSheet.tsx`).

Escopo restrito a esse drawer — TCV continua igual.
