# Brownfield Assessment: Indicadores

**Data:** 2026-03-30
**Escopo:** Seção de Indicadores (Comercial, Marketing, NPS, Growth, Sales Goals)
**Projeto:** Forward Bound - Dashboard de Planejamento Estrategico O2 Inc 2026

---

## 1. Visao Geral da Area

A seção de Indicadores é o coração analítico do dashboard, composta por 5 sub-abas:

| Sub-aba | Componente Principal | Tamanho | Complexidade |
|---------|---------------------|---------|--------------|
| Comercial | IndicatorsTab.tsx | 130KB | CRITICA |
| Marketing | MarketingIndicatorsTab.tsx | 32KB | ALTA |
| NPS | NpsTab.tsx | 9.6KB | MEDIA |
| Growth | GrowthTab.tsx | 15KB | BAIXA |
| Sales Goals | SalesGoalsTab.tsx | 10KB | MEDIA |

**Orquestrador:** `IndicatorsWrapper.tsx` (48 linhas) - wrapper limpo com tabs

---

## 2. Tech Stack da Area

- **Data Fetching:** 22+ hooks com @tanstack/react-query
- **Charting:** Recharts (bar, line, funnel, radial, pie)
- **UI:** shadcn-ui (cards, tabs, sheets, dialogs, collapsibles)
- **Dados Externos:** Pipefy CRM, Meta Ads API, Google Ads API, Oxy Finance API, Google Sheets

---

## 3. Problemas Identificados

### 3.1 CRITICO: God Component (IndicatorsTab.tsx - 130KB)

- ~3.000+ linhas em um unico arquivo
- 15+ funcoes de formatação duplicadas
- 12+ useState para gerenciar modais e drill-downs
- 8+ secoes com renderizacao condicional
- Mistura logica de dados de 4 BUs no mesmo componente
- Sem error boundaries por secao

### 3.2 CRITICO: Duplicacao de Codigo

| Codigo Duplicado | Arquivos Afetados | Risco |
|------------------|-------------------|-------|
| `formatCompactCurrency()` | 6+ arquivos | Inconsistencia de formato |
| `formatNumber()` | 5+ arquivos | Bugs silenciosos |
| `parseNumericValue()` | 3+ hooks | Parsing inconsistente BR/US |
| Phase-to-indicator mappings | 4 locais | Dados incorretos se 1 desatualizar |
| Tipo `BUType` / `BuType` | 3+ definicoes | Confusao de imports |
| `getQuarter()` | 3+ arquivos | Redundancia |

### 3.3 CRITICO: Magic Numbers Hardcoded

| Valor | Local | Proposito |
|-------|-------|-----------|
| 54000 | salesData.ts | Ticket Oxy Hacker |
| 140000 | salesData.ts | Ticket Franquia |
| 10 | GrowthTab.tsx | Multiplo de valuation (10x ARR) |
| 0.25 / 0.60 / 0.15 | useConsolidatedMetas | Split MRR/Setup/Pontual |
| 3.5 | PerformanceGauges | Meta ROAS |
| 10000 | Varios hooks | Limite de registros por query |

### 3.4 ALTO: Arquitetura de Dados Fragmentada

```
Problema atual:
  IndicatorsTab
  ├── useIndicatorsRealized (12 queries mensais separadas!)
  ├── useModeloAtualMetas (3 queries Supabase)
  ├── useO2TaxMetas (pattern diferente)
  ├── useOxyHackerMetas (pattern diferente)
  ├── useExpansaoMetas (pattern diferente)
  └── Agregacao MANUAL no componente (useMemo)

Cada BU tem:
  - Fonte de dados diferente
  - Pattern de fetching diferente
  - Logica de agregacao diferente
  - Sem camada de consolidacao unificada
```

### 3.5 ALTO: Tratamento de Erros Ausente

- Se 1 de 4 BUs falha, toda a aba falha
- Sem exibicao parcial de dados
- Sem botao de retry
- Sem fallback para cache
- Sem error boundaries por chart/card

### 3.6 ALTO: CampaignsTable.tsx (45KB)

- Tabela monolitica que tenta ser universal (Meta, Google, Custom)
- Hierarquia aninhada: Campaign > AdSet > Ad
- Sem virtualizacao (100+ linhas renderizadas)
- Paginacao manual

### 3.7 MEDIO: Performance

- Todas 4 BUs fetchadas mesmo se usuario selecionou apenas 1
- 12 queries mensais separadas onde 1 query com date range bastaria
- ClickableFunnelChart renderiza detail sheet mesmo quando fechado
- Bundle da secao: ~650KB
- 39 console.log em producao

### 3.8 MEDIO: Inconsistencias de Dados

- `fixPossibleDateInversion()` usado em multiplos hooks (workaround, nao fix)
- Formato de data inconsistente (DD/MM/YYYY vs ISO)
- Revenue goals hardcoded no useMarketingIndicators
- salesData.ts com dados projetados hardcoded como fallback

### 3.9 BAIXO: UX/Acessibilidade

- Sem skeleton screens (apenas spinner generico)
- Tabelas nao scroll horizontal no mobile
- Icones sem aria-labels
- Sem navegacao por teclado em collapsibles
- Progress bars sem ARIA labels

---

## 4. Metricas de Qualidade Atual

| Metrica | Atual | Alvo |
|---------|-------|------|
| Maior arquivo | 130KB | <30KB |
| Funcoes de formatacao duplicadas | 6+ arquivos | 1 arquivo |
| Definicoes de phase mapping | 4 copias | 1 source |
| Magic numbers | 15+ instancias | Config file |
| Console.logs | 39 | 0 (ou logger) |
| Definicoes de tipo duplicadas | 3+ copias | 1 modulo |
| Cobertura de testes | 0% | >70% |
| Error states | Parcial | Completo |

---

## 5. Pontos Positivos

- UI polida com dark/light mode funcionando
- Boa separacao no nivel do Wrapper (tabs independentes)
- Uso correto de React Query para caching
- Componentes UI (shadcn) bem aplicados
- SalesGoalsTab com boa separacao Cards/Table/Charts
- NpsTab com estrutura razoavel (filters > processing > display)

---

## 6. Mapa de Dependencias (Indicadores)

```
IndicatorsWrapper
├── IndicatorsTab (Comercial)
│   ├── useIndicatorsRealized
│   │   ├── useModeloAtualMetas
│   │   ├── useO2TaxMetas
│   │   ├── useOxyHackerMetas
│   │   └── useExpansaoMetas
│   ├── useConsolidatedMetas
│   │   ├── useMonetaryMetas (DB)
│   │   └── MediaMetasContext
│   ├── useCloserMetas / useClosersMetas
│   ├── useCostStageMetas
│   ├── ClickableFunnelChart
│   ├── ClickableRadialCard
│   ├── PeriodFunnelChart
│   ├── LeadsMqlsStackedChart
│   ├── MeetingsScheduledChart
│   └── SalesFunnelVisual
│
├── MarketingIndicatorsTab (Marketing)
│   ├── useMarketingIndicators (Google Sheets)
│   ├── useMarketingAttribution
│   ├── useMetaCampaigns
│   ├── useGoogleCampaigns
│   ├── useConsolidatedMetas
│   ├── useCostStageMetas
│   ├── 12 sub-componentes em marketing-indicators/
│   └── CampaignsTable (45KB)
│
├── NpsTab
│   ├── useNpsData
│   ├── useOperationsData
│   └── 8 sub-componentes em nps/
│
├── SalesGoalsTab
│   ├── MediaMetasContext
│   ├── salesData.ts (fallback hardcoded)
│   ├── SalesGoalsCards
│   ├── SalesGoalsTable
│   ├── SalesGoalsCharts
│   └── ExpansaoBreakdown
│
└── GrowthTab
    ├── useOperationsData
    ├── useMrrBase
    └── MetricCards (inline)
```
