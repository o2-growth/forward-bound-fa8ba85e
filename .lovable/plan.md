## Mudanças no `CommercialPaceDashboard` (tela nova "Visão Meta Pace" do Comercial)

### 1. Incluir **MQL** no funil
- Adicionar `'mql'` ao `MetricKey` e ao `METRIC_DEFS` (cor: `--m-mql` mapeada para `hsl(var(--chart-2))` ou similar). Ordem: MQL → RM → RR → Prop → Venda.
- Estender a interface `funnelMetas` para `{ mql, rm, rr, proposta, venda }`.
- Atualizar `CloserAgg`, `seriesFor`, `totalsFor`, `countGoalsFor`, `widths`, `steps` (incluir conversão `mql→rm`) e o toggle de métricas para considerar MQL.
- No `IndicatorsTab.tsx` (linha 3016), passar `mql: metaFor('mql')` no `funnelMetas` — `metaFor` já consulta `indicatorConfigs`, que vem de `useEffectiveMetas` (fonte = `funnel_metas`, ou seja, Plan Growth).
- `itemsByIndicator.mql` já é populado em `IndicatorsTab` (`IndicatorType` inclui `'mql'`), então o agregador por dia funciona sem mudanças adicionais.

### 2. Buscar **meta do mês conforme Plan Growth**
- `funnelMetas` já é derivada de `getMetaForIndicator` → `indicatorConfigs` → `useEffectiveMetas`, que lê `funnel_metas` (tabela onde o Plan Growth grava `leads/mqls/rms/rrs/propostas/vendas`). Confirmar comportamento adicionando `mql` ao mapeamento (item 1).
- Atualizar a `footnote` para explicitar: "Metas do funil vêm do Plan Growth (`funnel_metas`), rateadas pelo período filtrado."

### 3. Incluir **Faturamento** na evolução diária do funil
- Adicionar nova métrica `'fat'` ao chart (separada de `METRIC_DEFS` para não poluir o funil de contagem):
  - Série realizado: para cada dia, somar `itemRevenue(item)` dos `itemsByIndicator.venda` cuja `item.date` cai naquele dia. Modo `cum` = acumulado, `daily` = por dia.
  - Série meta (pace): `revenueMeta / totalDays` (acumulado ou diário), igual ao tratamento das outras métricas.
- Adicionar chip de toggle "Faturamento" no `metric-toggles` (mesmo padrão visual, com cor `--m-fat` distinta, ex.: `hsl(var(--chart-3))`).
- Como Faturamento é em R$ e as demais são contagens, usar **YAxis secundário** (`yAxisId="fat"`, `orientation="right"`, formatter `brl`) e ligar a `Line` do Faturamento a esse eixo.
- Tooltip: formatar valores de `fat`/`fat_meta` com `brl`.

### Arquivos
- `src/components/planning/indicators/CommercialPaceDashboard.tsx` — extensões acima.
- `src/components/planning/IndicatorsTab.tsx` — adicionar `mql` ao objeto `funnelMetas` passado na linha 3016.

### Fora de escopo
- Sem alterações no `ComercialPreview.tsx` (página mock).
- Sem mudanças em hooks/Plan Growth — apenas consumo.
