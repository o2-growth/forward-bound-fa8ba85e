## Objetivo
Adicionar filtragem por período no dashboard **Pace Comercial**, mantendo o design fiel ao HTML original e usando o design system do projeto.

## Mudanças

### 1. `CommercialPaceDashboard.tsx`
- Adicionar `DateRangePickerGA` (mesmo componente já usado nos outros indicadores) no header, ao lado direito do título — substituindo/complementando o badge "month-pace".
- Receber `startDate` / `endDate` via props (vindos do `IndicatorsTab`, que já possui esses estados globais) **e** permitir override local através do picker.
- Recalcular automaticamente ao mudar período:
  - `monthFactors` via `getMonthFactors(startDate, endDate)` para ratear metas mensais por dias úteis.
  - `paceExpected` baseado em dias úteis decorridos vs. dias úteis totais do intervalo (não mais "dia do mês").
  - Série diária do gráfico de evolução agora cobre todos os dias do intervalo selecionado (não apenas o mês corrente).
  - Hot opportunities, funil, ranking e gauges respeitam o filtro de data já aplicado em `useIndicatorsRealized` / `modeloAtualAnalyticsRaw`.
- Atualizar o badge "month-pace" para exibir o intervalo selecionado (ex.: "01/03 – 15/03 • 11 du de 22") em vez de só o mês.

### 2. `IndicatorsTab.tsx`
- Passar `startDate` e `endDate` (já existentes no escopo do tab) como props para `<CommercialPaceDashboard />`.
- Garantir que `hotOpportunityItems` e demais datasets enviados ao dashboard usam o mesmo intervalo.

## Detalhes técnicos
- Reusar `getMonthFactors` (`src/lib/businessDayProrate.ts`) para prorratar metas (`closer_absolute_metas`, `funnel_metas`, `monetary_metas`) ao intervalo selecionado.
- Para `paceExpected`: `min(1, businessDaysElapsed / totalBusinessDays)` onde "elapsed" = du entre `startDate` e `min(today, endDate)`.
- Sem mudança em hooks ou queries — apenas a UI e o cálculo local de pace.
- Sem novos endpoints, sem migração de banco.

## Fora do escopo
- Mudar lógica de metas globais ou criar filtros novos além do período.
- Alterar outras abas/visões.
