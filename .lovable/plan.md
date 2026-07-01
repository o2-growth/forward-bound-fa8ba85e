# Plano — Correções na aba Indicadores · Marketing

Auditoria concluída em toda a aba. Encontrei **3 bugs críticos**, **4 inconsistências de dados** e **5 melhorias de exibição/filtro**. Abaixo agrupo por prioridade — sugiro começar por P1 (bugs que afetam número exibido) e você decide se seguimos com P2/P3 nesta rodada ou em separado.

## Prioridade 1 — Bugs críticos que mostram número errado

1. **Denominador de vendas único (`salesInPeriod`)**
   - Hoje coexistem 3 contagens de venda: `salesInPeriod.length`, `pipefyVolumes.vendas`, `pipefyTotals.vendas`. Divergem entre Hero, PerformanceGauges, CostPerStageGauges e SourceFunnelSection.
   - Fix: usar `salesInPeriod.length` em todos os pontos (CAC gauge, CPV gauge, ROI LTV, SourceFunnel source="all").

2. **Comparação com período anterior em "Resultados Gerais" sempre zerada**
   - `OverallResultsSection` filtra `salesCards` (já do período atual) por `prevRange` → sempre 0, delta arrows sempre −100%.
   - Fix: buscar vendas do período anterior via hook independente (novo `salesCardsPrev`) e passar para a seção.

3. **`Ganho` excluído de LTV, avgMRR e drill-down de canal**
   - `realPerformanceMetrics` e `ChannelAttributionCards` filtram `fase === 'Contrato assinado'` (string match), ignorando `'Ganho'`.
   - Fix: trocar por `isSaleFase(c.fase)` de `marketingFunnelAggregator.ts`.

4. **Meta de GMV sem Educação, mas GMV real com Educação**
   - `consolidatedRevenueGoals.gmv = mrr+setup+pontual`; real `= mrr+setup+pontual+educacao`. Gera falsa sensação de over-performance.
   - Fix: incluir educação também na meta (padrão do projeto: Educação só entra em GMV).

## Prioridade 2 — Consistência de dados

5. **CAC do PerformanceGauges com denominador diferente do Hero/CacTotalCard** — trocar `pipefyVolumes.vendas` por `salesInPeriod.length`.
6. **Drill-down do CostPerStageGauges compara valor errado** — modal usa `data.costPerStage[key]` (sheet); trocar por `enrichedTotals.costPerStage[key]` (live).
7. **CPV em "Performance de Campanhas — Criativos" deflacionado** — divide invest de mídia paga por TODAS as vendas (inclui orgânico/outbound/eventos). Filtrar `salesCards` para `detectChannel ∈ {meta_ads, google_ads}` só nesse KPI strip.
8. **`PHASE_FUNNEL_MAP` duplicado** em `SourceFunnelSection.tsx` — importar do `marketingFunnelAggregator.ts`.

## Prioridade 3 — Exibição/filtros

9. **Tabela Indicadores 26 ignora o filtro de data** (é sempre ano cheio 2026). Ou passar `dateRange`, ou rotular explicitamente "Visão Anual 2026 — não muda com o filtro".
10. **Filtro `selectedBU` só filtra campanhas** — todos os funis/receita continuam consolidados. Ou propagar para hooks de BU, ou renomear controle para "Filtrar Campanhas por BU".
11. **Investimento de Eventos fixo em R$25k** (fallback silencioso) — expor no UI e tornar configurável na tela (ou vir de fonte real).
12. **Online vs Offline compara populações incompatíveis** (leads do período × vendas do período, sem cohort) — adicionar cohort join ou disclaimer.
13. **Duas fórmulas de LTV coexistindo** (`avgMRR × 12` vs `ARPU × 1/churn`) — padronizar em uma só.

## Ordem de execução sugerida

Começar por **P1 (itens 1–4)** numa PR só, validar visualmente cada card, depois P2, e P3 pode virar issues separadas conforme prioridade sua.

## Perguntas antes de implementar

- Confirma que faço **P1 + P2** agora (8 fixes) e deixo **P3** para depois?
- Para o item 11 (Eventos): posso tratar como configurável via UI ou você prefere que puxe de uma fonte específica que já exista?
- Para o item 13 (LTV): mantemos `ARPU × 1/churn` (padrão Indicadores 26) ou `MRR × 12` (mais simples)?