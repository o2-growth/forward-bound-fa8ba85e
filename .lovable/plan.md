## Objetivo

Fazer o **Realizado** do gráfico "Faturamento Acumulado" puxar exatamente do mesmo lugar que o acelerômetro **Fat Incremento** — ou seja, dos cards de **venda do Pipefy** (`vendaItems`), respeitando os filtros de BU, Closer, SDR e Origem — em vez de buscar do Oxy Finance (DRE/daily_revenue). A meta continua vindo do `metaForRange` (já alinhado).

## O que muda

Em `src/components/planning/IndicatorsTab.tsx`, dentro do bloco que monta o `RevenuePaceChart` (linhas ~3140–3395):

1. **Remover** as fontes Oxy Finance / fallback Pipefy mistas usadas para `totalRealized` e `periodRealized`:
   - `hasDailyRevenueData`, `getDailyRevenueForBUs`, `isTotalOverride`, `getMrrBaseForMonth`
   - Os branches `pipefyExpansaoCards` + `allSetupPontualCards`
   - O cálculo de `mrrBaseTotal`

2. **Usar `vendaItems`** (já existe na linha 3359 via `getItemsForIndicator('venda')`) como única fonte do realizado. Esses items já respeitam BU/Closer/SDR/Origem, exatamente como o acelerômetro Fat Incremento (`getRealizedMonetaryForIndicator('faturamento')`).

3. **Novo cálculo do realizado**:
   - `totalRealized = soma de vendaItems.value onde item.date ∈ [startDate, endDate]`
   - Para cada bucket do `paceChartData` (daily/weekly/monthly):
     - `periodRealized = soma de vendaItems.value onde item.date ∈ [periodStart, periodEnd]`
   - Cumulativo período a período (mantém comportamento "acumulado")

4. **Passar `mrrBase={0}`** ao componente (já é o caso) — o header do chart mostra `totalRealized + mrrBase`, então o número exibido baterá com o gauge.

5. **Loading state**: remover `isLoadingDre` da condição `isLoading`; manter apenas analytics de BU + `isLoadingMrrBase` (ou tirar também já que mrrBase virou 0).

6. **Meta** (`totalMeta`, `periodMeta`, `metaForRange`): **sem alterações** — continua vindo de `getMetaMonetaryForPeriod('faturamento', ...)`.

7. **Badge "DRE (Oxy Finance)"** no `RevenuePaceChart.tsx`: trocar o label para **"Pipefy (Vendas)"** para refletir a nova fonte. Ícone `Database` mantido.

## Resultado esperado

- O total de Realizado do gráfico = valor do acelerômetro Fat Incremento, para qualquer combinação de filtros (BU, Closer, SDR, Origem, período).
- A linha "Realizado Acumulado" mostra o pace real das vendas Pipefy crescendo ao longo do período.
- A linha "Meta Acumulada" continua alinhada com a meta do gauge (já estava).
- Nenhuma mudança em outros gráficos, tier breakdown, ou na lógica de meta.

## Arquivos afetados

- `src/components/planning/IndicatorsTab.tsx` (bloco do RevenuePaceChart, ~linhas 3140–3395)
- `src/components/planning/indicators/RevenuePaceChart.tsx` (texto do badge de fonte)
