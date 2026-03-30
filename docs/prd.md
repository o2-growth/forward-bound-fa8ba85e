# PRD: Refactoring da Secao de Indicadores

**Data:** 2026-03-30
**Versao:** 1.0
**Status:** Draft para validacao

---

## Objetivo

Refatorar a secao de Indicadores do Forward Bound para resolver debt tecnico critico, melhorar manutenibilidade, performance e resiliencia a erros, sem alterar funcionalidades existentes para o usuario final.

## Metricas de Sucesso

| Metrica | Antes | Depois |
|---------|-------|--------|
| Maior arquivo da secao | 130KB | <30KB |
| Funcoes duplicadas | 6+ copias | 1 source |
| Error recovery | Nenhum | Retry + partial render |
| Queries por carregamento (Comercial) | 12+ separadas | 1-4 consolidadas |
| Cobertura de testes | 0% | >70% utils, >50% hooks |

---

## Epics

### Epic 1: Fundacao - Utils & Types Centralizados
**Prioridade:** P0 (CRITICO)
**Impacto:** ALTO | **Esforco:** BAIXO
**Risco:** Baixo - nao altera comportamento, apenas centraliza

#### Stories:

**Story 1.1: Criar modulo de formatacao centralizado**
- Criar `src/utils/indicators/formatters.ts`
- Extrair: `formatCurrency`, `formatNumber`, `formatCompactCurrency`, `formatPercent`, `parseNumericValue`
- Substituir todas as copias locais por imports do modulo
- Testes unitarios para cada funcao

**Story 1.2: Centralizar tipos e constantes**
- Criar `src/utils/indicators/types.ts` com `IndicatorType`, `BUType`, `FunnelStage`, `ChartGrouping`
- Criar `src/utils/indicators/constants.ts` com ticket values, splits, limites, cores por BU
- Remover definicoes duplicadas em hooks e componentes
- Criar barrel export `src/utils/indicators/index.ts`

**Story 1.3: Centralizar phase mappings**
- Criar `src/utils/indicators/phaseMappings.ts`
- Unificar as 4 copias de phase-to-indicator mappings
- Incluir mappings para: Modelo Atual, O2 Tax, Oxy Hacker, Expansao
- Testes unitarios para cada mapping

---

### Epic 2: Camada de Consolidacao de Dados
**Prioridade:** P0 (CRITICO)
**Impacto:** ALTO | **Esforco:** MEDIO
**Risco:** Medio - altera data flow, precisa testes rigorosos

#### Stories:

**Story 2.1: Criar hook useConsolidatedIndicators**
- Criar `src/hooks/indicators/useConsolidatedIndicators.ts`
- Agregar dados das 4 BUs em uma unica interface
- Implementar error handling por BU (graceful degradation)
- Retornar `{ data, isLoading, errors, refetch }` com status por BU
- Se 1 BU falha, as outras continuam exibindo

**Story 2.2: Padronizar fetching por BU**
- Criar hook generico `useBUData(bu, dateRange)` que encapsula patterns diferentes
- Substituir 12 queries mensais por 1 query com date range onde possivel
- Manter React Query para caching e retry automatico
- Adicionar `staleTime` e `retry` consistentes

**Story 2.3: Criar hook de filtros compartilhados**
- Criar `src/hooks/indicators/useIndicatorFilters.ts`
- Gerenciar: dateRange, selectedBUs, period (daily/monthly/accumulated)
- Compartilhar estado de filtros entre sub-abas
- Persistir filtros em URL params (opcional)

---

### Epic 3: Decomposicao do IndicatorsTab
**Prioridade:** P1 (ALTO)
**Impacto:** ALTO | **Esforco:** ALTO
**Risco:** Alto - componente central, precisa manter comportamento identico

#### Stories:

**Story 3.1: Extrair secao de Funil (FunnelSection)**
- Criar `src/components/indicators/comercial/FunnelSection.tsx`
- Mover ClickableFunnelChart e logica de funil relacionada
- Mover PeriodFunnelChart e SalesFunnelVisual
- Props: funnelData, onDrillDown

**Story 3.2: Extrair secao de KPIs (KpiCardsSection)**
- Criar `src/components/indicators/comercial/KpiCardsSection.tsx`
- Mover RadialProgressCard, MonetaryRadialCard e cards de metricas
- Usar formatters centralizados
- Props: kpiData, goals

**Story 3.3: Extrair secao de Closers (CloserPerformance)**
- Criar `src/components/indicators/comercial/CloserPerformance.tsx`
- Mover logica de performance por closer
- Mover findTopPerformer e ranking

**Story 3.4: Extrair DetailSheet (componente de drill-down)**
- Criar `src/components/indicators/comercial/DetailSheet.tsx`
- Consolidar 6 useState de modal em 1 state object ou reducer
- Mover logica de renderizacao de detalhes
- Usar compound component pattern

**Story 3.5: Criar ComercialTab orquestrador**
- Novo `src/components/indicators/comercial/ComercialTab.tsx` (<200 linhas)
- Compor FunnelSection + KpiCardsSection + CloserPerformance + DetailSheet
- Usar useConsolidatedIndicators como unica fonte de dados
- Substituir IndicatorsTab.tsx original

---

### Epic 4: Refactoring CampaignsTable
**Prioridade:** P1 (ALTO)
**Impacto:** MEDIO | **Esforco:** MEDIO
**Risco:** Medio - componente complexo mas isolado

#### Stories:

**Story 4.1: Separar tabelas por canal**
- Criar `MetaCampaignsTable.tsx` (~10KB)
- Criar `GoogleCampaignsTable.tsx` (~10KB)
- Cada uma com sua logica de nested drill-down
- Manter CampaignsTable como orquestrador que escolhe qual renderizar

**Story 4.2: Implementar virtualizacao**
- Adicionar TanStack Table ou react-virtual para listas grandes
- Lazy load de dados nested (AdSets, Ads)
- Paginacao server-side via Edge Function

---

### Epic 5: Error Handling & Resiliencia
**Prioridade:** P1 (ALTO)
**Impacto:** ALTO | **Esforco:** BAIXO
**Risco:** Baixo - adiciona funcionalidade sem alterar existente

#### Stories:

**Story 5.1: Adicionar Error Boundaries por secao**
- Criar `IndicatorErrorBoundary` component
- Envolver cada secao (Funil, KPIs, Charts) com error boundary
- Exibir mensagem amigavel + botao retry por secao
- Log de erros para debugging

**Story 5.2: Implementar loading states granulares**
- Substituir spinner generico por skeleton screens
- Mostrar dados parciais (BUs que ja carregaram)
- Indicador visual de quais BUs estao carregando/falharam
- Botao retry por BU individual

**Story 5.3: Remover console.logs e adicionar logging**
- Remover 39 console.log/warn statements
- Criar utility de logging com levels (debug/info/warn/error)
- Logging condicional (desativado em producao)

---

### Epic 6: Testes
**Prioridade:** P2 (MEDIO)
**Impacto:** ALTO | **Esforco:** MEDIO
**Risco:** Nenhum - apenas adiciona

#### Stories:

**Story 6.1: Testes unitarios para utils**
- Testar formatters (currency, number, compact, percent)
- Testar parseNumericValue com formatos BR e US
- Testar phase mappings (todas as variacoes)
- Testar calculations (conversion rates, aggregations)
- Meta: >90% coverage em utils/

**Story 6.2: Testes de integracao para hooks**
- Testar useConsolidatedIndicators com mocks de BU
- Testar cenario de 1 BU falhando (graceful degradation)
- Testar cenario de retry
- Testar useBUData com diferentes BUs
- Meta: >70% coverage em hooks/

**Story 6.3: Testes de componentes**
- Testar ComercialTab com dados mockados
- Testar FunnelSection com drill-down
- Testar KpiCardsSection com valores limites
- Testar error boundary rendering
- Meta: >50% coverage em components/

---

### Epic 7: Performance
**Prioridade:** P2 (MEDIO)
**Impacto:** MEDIO | **Esforco:** MEDIO
**Risco:** Baixo

#### Stories:

**Story 7.1: Otimizar queries**
- Consolidar 12 queries mensais em 1 com date range
- Adicionar indice no banco para date ranges em pipefy_moviment_cfos
- Implementar paginacao server-side em Edge Functions
- Remover `limit: 10000` hardcoded

**Story 7.2: Code splitting e lazy loading**
- React.lazy para sub-abas (Marketing, NPS, Growth, SalesGoals)
- React.memo em chart components (ClickableFunnelChart, etc)
- Lazy load de dados nested (ads dentro de adsets)
- Objetivo: reduzir bundle de ~650KB para ~350KB

**Story 7.3: Otimizar re-renders**
- Auditar useMemo dependencies em todos os hooks
- ClickableFunnelChart: nao renderizar detail sheet quando fechado
- Fetch seletivo: so buscar BUs selecionadas
- Usar React DevTools Profiler para validar

---

## Ordem de Execucao Recomendada

```
Semana 1-2: Epic 1 (Fundacao) + Story 5.3 (console.logs)
    │
    ▼
Semana 3:   Epic 2 (Consolidacao de Dados)
    │
    ▼
Semana 4-5: Epic 3 (Decomposicao IndicatorsTab)
    │
    ▼
Semana 5:   Epic 5 (Error Handling) - Stories 5.1 e 5.2
    │
    ▼
Semana 6:   Epic 4 (CampaignsTable) + Epic 6 (Testes)
    │
    ▼
Semana 7:   Epic 7 (Performance)
```

## Restricoes

- **Zero breaking changes para o usuario** - UI deve se comportar identicamente
- **Incremental PRs** - cada Story = 1 PR focado
- **Testes obrigatorios** - toda Story de refactoring precisa de testes de regressao
- **QA review em toda Story** - risco de regressao alto em brownfield

## Fora de Escopo

- Novas funcionalidades de indicadores
- Mudancas de layout/design
- Migracao de banco de dados
- Novos endpoints de API
- Acessibilidade (WCAG) - sera um epic futuro separado
