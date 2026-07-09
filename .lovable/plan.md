## Objetivo
Permitir inspecionar os no-shows a partir do drill-down do acelerômetro RR ("Quem Apareceu nas Reuniões?"), reutilizando a mesma DetailSheet já aberta.

## O que muda (UX)
Dentro da sheet do RR, o card KPI "❌ No-Shows" passa a ser **clicável**:

- Clique nele → a sheet troca para o modo "No-Shows": lista as reuniões marcadas (RM) do período que **não** viraram RR, com colunas próprias e descrição atualizada.
- Um segundo clique (ou clique em "✅ Realizadas") volta ao modo padrão (lista de RRs).
- Um pequeno indicador visual (borda/realce) mostra qual modo está ativo.

Sem sheet aninhada, sem nova rota — só um toggle interno de estado.

## Como funciona (técnico)

1. `KpiItem` (em `src/components/planning/indicators/KpiCard.tsx`) ganha um campo opcional `onClick?: () => void` e um `active?: boolean`. Quando presentes, o card vira `cursor-pointer` com um `ring` quando ativo.

2. Em `IndicatorsTab.tsx`, no `case 'rr'` (linhas ~2124-2198):
   - Continuar calculando `rrItems = items` como hoje.
   - Calcular `rmItems = getItemsForIndicator('rm')` e `noShowItems = rmItems.filter(rm => !rrIds.has(rm.id))` (dedup por `id`).
   - Novo estado local `rrView: 'realizadas' | 'no_shows'` (default `'realizadas'`).
   - Adicionar `onClick` ao KPI No-Shows (só quando `noShows > 0`) que alterna `rrView`. O KPI "✅ Realizadas" também vira clicável para voltar. Aplicar `active` conforme o modo.
   - Quando `rrView === 'no_shows'`:
     - `setDetailSheetTitle('RR - No-Shows')`
     - Descrição: `{noShows} reuniões marcadas que não aconteceram | Potencial perdido: {formatCompactCurrency(potencialNoShow)} | Top SDR afetado: ...`
     - Colunas focadas no no-show: Produto, Empresa, SDR, Closer, Faixa Faturamento, Data RM, Dias desde RM, Fase atual.
     - Items = `noShowItems`.
     - Filter criteria explica: "Cards que entraram em RM no período mas nunca entraram em RR até hoje (comparação por id de card)."
   - Quando `rrView === 'realizadas'`: comportamento atual.

3. Como o KPI clique dispara `setState` dentro do handler que já roda ao abrir a sheet, extrair a montagem da sheet para um pequeno helper `applyRrSheet(view)` chamado (a) na abertura inicial com `'realizadas'`, e (b) pelo `onClick` dos KPIs. Isso evita reabrir a sheet.

## Escopo/limites
- Vale para todas as BUs (Modelo Atual, O2 TAX, Oxy Hacker, Franquia, Consolidado) porque a derivação usa `getItemsForIndicator('rm'|'rr')` que já existe para todas.
- Sem alteração no `NoShowWidget` isolado nem em hooks de dados.
- Sem mudanças em métricas, metas ou back-end.

## Reversão
Remover `onClick/active` dos KPIs no `case 'rr'` e o estado `rrView` — nenhum efeito colateral em outros drill-downs.