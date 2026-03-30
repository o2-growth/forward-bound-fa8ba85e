# Architecture Review: Indicadores

**Data:** 2026-03-30
**Foco:** Secao de Indicadores - Arquitetura atual vs. recomendada

---

## 1. Arquitetura Atual

### 1.1 Camadas

```
[UI Components] ──────────> Renderizacao direta no componente
      │
[Data Hooks] ─────────────> 22+ hooks independentes sem consolidacao
      │
[Edge Functions] ─────────> 18 funcoes, cada uma com pattern diferente
      │
[External APIs] ──────────> Pipefy, Meta, Google, Oxy Finance, Sheets
```

**Problema central:** Nao existe camada de consolidacao entre hooks e componentes.
Cada componente faz sua propria agregacao, formatacao e tratamento de erros.

### 1.2 Data Flow Atual (Comercial)

```
IndicatorsTab.tsx
  │
  ├─ useIndicatorsRealized()
  │    ├─ 12x supabase.functions.invoke('query-external-db') por mes
  │    ├─ parseNumericValue() (local)
  │    ├─ fixPossibleDateInversion() (local)
  │    └─ aggregateByBU() (inline useMemo)
  │
  ├─ useModeloAtualMetas()
  │    ├─ 3x supabase queries
  │    ├─ parseNumericValue() (copia local)
  │    └─ PHASE_MAPPING v1
  │
  ├─ useO2TaxMetas()
  │    ├─ pattern completamente diferente
  │    └─ PHASE_MAPPING v2
  │
  └─ (manual useMemo aggregation in component)
       └─ formatCompactCurrency() (copia local)
```

### 1.3 Gargalos de Escalabilidade

| Gargalo | Impacto | Severidade |
|---------|---------|------------|
| 12 queries mensais separadas | Latencia alta, rate limiting | CRITICO |
| Sem batch/parallel nas Edge Functions | Requests sequenciais | ALTO |
| Toda logica de negocio no frontend | Bundle pesado, logica exposta | ALTO |
| Sem cache layer entre API e hooks | Re-fetch desnecessario | MEDIO |
| Sem paginacao server-side | Payloads de 2-3MB | MEDIO |

---

## 2. Arquitetura Recomendada

### 2.1 Nova Estrutura de Camadas

```
[UI Components] ───> Componentes focados, <30KB cada
      │
[Presentation Hooks] ──> Hooks de UI (modais, filtros, formatacao)
      │
[Data Consolidation Layer] ──> useConsolidatedIndicators (1 hook master)
      │
[Data Fetching Hooks] ──> Hooks padronizados por BU
      │
[Edge Functions] ──> Consolidadas com batch support
      │
[External APIs]
```

### 2.2 Modulos Propostos

```
src/
├── utils/indicators/
│   ├── formatters.ts          # formatCurrency, formatNumber, formatCompact
│   ├── types.ts               # IndicatorType, BUType, FunnelStage (UNICO)
│   ├── constants.ts           # Ticket values, splits, limits, colors
│   ├── phaseMappings.ts       # TODAS as phase-to-indicator (UNICO)
│   └── calculations.ts        # Conversion rates, aggregations
│
├── hooks/indicators/
│   ├── useConsolidatedIndicators.ts  # Hook master - agrega 4 BUs
│   ├── useBUData.ts                  # Hook generico por BU
│   └── useIndicatorFilters.ts        # Filtros de data/BU/periodo
│
├── components/indicators/
│   ├── comercial/
│   │   ├── ComercialTab.tsx           # Orquestrador (<200 linhas)
│   │   ├── FunnelSection.tsx          # Funil com drill-down
│   │   ├── KpiCardsSection.tsx        # Cards de metricas
│   │   ├── CloserPerformance.tsx      # Performance closers
│   │   └── DetailSheet.tsx            # Sheet de detalhes (extraido)
│   │
│   ├── marketing/
│   │   ├── MarketingTab.tsx           # Orquestrador
│   │   ├── campaigns/
│   │   │   ├── MetaCampaignsTable.tsx     # Tabela Meta
│   │   │   ├── GoogleCampaignsTable.tsx   # Tabela Google
│   │   │   └── CampaignDrillDown.tsx      # Drill-down
│   │   └── (sub-componentes existentes OK)
│   │
│   ├── nps/                   # Ja razoavel - pequenos ajustes
│   ├── growth/                # Ja razoavel - extrair magic numbers
│   └── sales-goals/           # Ja razoavel - remover fallback hardcoded
```

### 2.3 Data Flow Recomendado

```
ComercialTab.tsx
  │
  └─ useConsolidatedIndicators({ bus, dateRange, period })
       │
       ├─ useBUData('modelo_atual', dateRange)
       │    └─ 1 query com date range (nao 12 por mes)
       │
       ├─ useBUData('o2_tax', dateRange)
       ├─ useBUData('oxy_hacker', dateRange)
       ├─ useBUData('franquia', dateRange)
       │
       ├─ Error handling por BU (graceful degradation)
       ├─ Aggregacao centralizada
       └─ Returns { realized, goals, variance, status: per-BU }
```

---

## 3. Seguranca

### 3.1 Riscos Identificados

| Risco | Severidade | Mitigacao |
|-------|-----------|-----------|
| Edge functions com `limit: 10000` sem paginacao | MEDIO | Implementar paginacao server-side |
| Credenciais Meta/Google em env vars | BAIXO | Ja em Supabase secrets (OK) |
| Console.logs podem expor dados sensiveis | BAIXO | Remover em producao |
| Logica de negocios exposta no frontend | BAIXO | Mover calculos criticos para Edge Functions |

### 3.2 Pontos Positivos de Seguranca

- RLS (Row Level Security) ativo no Supabase
- Auth com Supabase Auth (JWT)
- ProtectedRoute no frontend
- Tab permissions por usuario
- Audit logs para acoes admin

---

## 4. Prioridades de Refactoring

### Fase 1: Fundacao (CRITICO)
1. Criar `src/utils/indicators/` com formatters, types, constants, phaseMappings
2. Criar `useConsolidatedIndicators` como camada de consolidacao
3. Adicionar error boundaries por secao

### Fase 2: Decomposicao (ALTO)
4. Quebrar IndicatorsTab.tsx em 4-5 componentes focados
5. Quebrar CampaignsTable.tsx em tabelas por canal
6. Extrair modal/sheet state management

### Fase 3: Qualidade (MEDIO)
7. Adicionar testes unitarios para formatters e calculations
8. Adicionar testes de integracao para consolidacao de dados
9. Remover console.logs e magic numbers
10. Melhorar loading states (skeletons) e error states (retry)

### Fase 4: Performance (MEDIO)
11. Consolidar 12 queries mensais em 1 query com date range
12. Lazy load chart components
13. Virtualizar tabelas grandes
14. Code splitting por sub-aba
