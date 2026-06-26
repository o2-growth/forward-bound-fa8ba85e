## Auditoria de período — Visão CEO

Verifiquei cada indicador da aba contra o `dateRange` do header.

| Seção | Indicador | Respeita período? |
|---|---|---|
| **Comercial** | Vendas, Faturamento, MRR novo, Ticket, ARR, Vendas por BU | ✅ via `useModeloAtualMetas/useO2TaxMetas/useExpansaoMetas/useOxyHackerMetas/useOutboundAnalytics/useMonetizacaoAnalytics` |
| **Aquisição** | Invest. mídia, Leads, MQLs, Custo/MQL, CPL, canais | ✅ via `useMetaCampaigns/useGoogleCampaigns/useMarketingSheetData` + getQtyForPeriod |
| **Operação/Churn** | Churn (logos), Churn por squad, MRR perdido | ✅ (corrigido na rodada anterior — dossier filtrado por `dateRange`) |
| **Operação/Churn** | Clientes ativos, MRR base, Tratativas, MRR em risco | ❌ snapshot atual — `useOperationsData()` não aceita período |
| **Pessoas** | Headcount, Turnover, Admissões, Desligados, Tempo de casa | ✅ via `useHrData({startDate,endDate})` |
| **NPS** | NPS, CSAT, Promotores, Detratores, Neutros | ❌ `useNpsData()` não aceita período — devolve snapshot global |

## Correções

### 1. NPS por período (`src/components/planning/CeoViewTab.tsx`)

O hook `useNpsData()` expõe `raw.npsRows` e cada linha tem `Entrada` (timestamp ISO). No `useMemo` `nps`:

- Filtrar `raw.npsRows` para `Entrada >= startDate && Entrada <= endDate`.
- Reprocessar com `processNpsData(rowsFiltrados, raw.cfoMap, raw.titleMap, raw.npsPipeId, raw.totalEligible, raw.cfoEligibleMap)`.
- Se `rowsFiltrados.length === 0`, manter o fallback atual (snapshot Q4/2025) e marcar `source: "snapshot"`.
- Importar `processNpsData` de `@/hooks/useNpsData`.

Resultado: NPS, CSAT e distribuição passam a refletir respostas do período escolhido.

### 2. Sinalizar KPIs de snapshot (Operação)

`clientesAtivos`, `mrrBase`, `tratativas`, `mrrEmRisco` são intrinsecamente "estado atual" (vêm de `phaseCount` global do Pipefy, sem histórico). Adicionar `sublabel="base atual (snapshot)"` nesses 4 `MetricCard` para deixar claro que não mudam com o filtro de data — evita a mesma dúvida que surgiu com churn.

## Escopo

Apenas `src/components/planning/CeoViewTab.tsx`. Nenhuma mudança em hooks ou em outras abas.
