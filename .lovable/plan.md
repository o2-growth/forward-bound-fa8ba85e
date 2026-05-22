## Indicadores de fonte de dados em toda aba Operação

Adicionar um ícone (i) ao lado de cada KPI, card, tabela e gráfico da aba Operação (`CustomerSuccessTab`), com tooltip detalhando **sistema de origem → pipe/tabela → regra de cálculo → link direto** quando aplicável.

### 1) Componente reutilizável `DataSourceInfo`

Criar `src/components/planning/cs/DataSourceInfo.tsx`:

```tsx
<DataSourceInfo
  sources={[
    { system: 'Pipefy', resource: 'Central de Projetos', url: 'https://app.pipefy.com/pipes/...' },
    { system: 'Oxy Finance', resource: 'API /revenue/recurring' },
    { system: 'Banco Lovable', resource: 'funnel_metas (RLS)' },
  ]}
  rules={[
    'MRR Total = CFOaaS + OXY de cards ativos',
    'Inclui apenas fases Onboarding e Em Operação Recorrente',
    'Cards de teste excluídos via isTestCard',
  ]}
  notes="Atualizado a cada refetch (~60s) | Overrides oficiais Abr/26"
/>
```

Render:
- `Info` (lucide) 3.5x3.5 muted-foreground com `cursor-help`
- Tooltip wide (`max-w-sm`) com seções: **Fonte(s)**, **Regra**, **Notas**, **Abrir →** (links)
- Reutiliza `Tooltip/TooltipTrigger/TooltipContent` já existentes

### 2) Catálogo de fontes (constante única)

Criar `src/components/planning/cs/dataSources.ts` exportando presets nomeados para cada indicador da aba, evitando duplicação de texto e mantendo a verdade em um lugar só. Exemplos:

- `DS.MRR_TOTAL`, `DS.CHURN_DOSSIE`, `DS.NPS_RESPOSTAS`, `DS.REUNIOES_REALIZADAS`, `DS.TAREFAS_ATRASADAS`, `DS.SETUP_STATUS`, `DS.HEALTH_SCORE`, `DS.TICKET_MEDIO`, `DS.SQUAD_CUSTO`, `DS.ALERTAS`, `DS.TRATATIVAS_ATIVAS`, etc.

Cada preset inclui `sources[]`, `rules[]`, `link` (Pipefy pipe ID via `PIPEFY_PIPES`).

### 3) Pontos de inserção (aba Operação inteira)

Aplicar `<DataSourceInfo source={DS.X} />` em **todos** os KPIs/cards/seções abaixo:

**Sub-aba "Visão Geral"** (`VisaoGeralCS.tsx` + `OperacaoKpisStrip.tsx`)
- KPIs: Total Ativos, Em Onboarding, Em Operação Recorrente, Em Tratativa, Em Setup, Setup Atrasados, MRR Total, Tratativas Ativas
- Gauge NPS / Health Score
- Mini-cards de churn do mês

**Sub-aba "Clientes"** (`ClientesView.tsx`)
- Cabeçalho da tabela e cada coluna calculada (Health, NPS, Tarefas Atrasadas, MRR, Fase)
- Drawer Cliente 360 — seção de origem dos dados (Pipefy card + NPS + Reuniões)

**Sub-aba "CFOs"** (`CfoView.tsx`)
- P&L Comparativo — info por linha (MRR Total, Custo Squad, Margem, Ticket Médio, Health Score, Churns)
- Card de cada CFO — Entrega, Tratativa, MRR em risco, NPS, Churns, Squad/Custo
- Tabela detalhada — colunas calculadas

**Sub-aba "Reuniões"** (`ReunioesView.tsx`)
- KPIs (realizadas, marcadas, sem reunião)
- Gráficos e tabelas por CFO/cliente

**Sub-aba "NPS"** (`NpsScoreCards.tsx`, `NpsGauges.tsx`, `NpsKpiCards.tsx`, `NpsDistributions.tsx`, `CfoPerformanceTable.tsx`, `QualitativeFeedback.tsx`, `OkrProximity.tsx`, `QuarterlyComparison.tsx`)
- NPS Score, Respondentes, Distribuição (Promotores/Neutros/Detratores), OKR Proximity, Quarterly Comparison, Feedback Qualitativo

**Sub-aba "Churn"** (`ChurnDossierSection.tsx`)
- KPIs (Quantidade, MRR perdido, LT médio, Save Rate)
- Tabela do dossiê — info sobre overrides oficiais Abr/26 e cards sintéticos

**Sub-aba "Alertas"** (`AlertasView.tsx`)
- Cada categoria de alerta (tarefas atrasadas, NPS detrator, tratativa longa, etc.)

### 4) Padrão visual

- Ícone `Info` sempre **à direita** do título (depois de qualquer texto/badge atual)
- 3.5×3.5 (`h-3.5 w-3.5`), `text-muted-foreground hover:text-foreground cursor-help`
- Tooltip com header em `uppercase tracking-wider text-[10px]` por seção
- Link "Abrir no Pipefy →" usa `ExternalLink` icon e abre em nova aba

### 5) Conteúdo dos tooltips (verdade)

Conteúdo construído a partir do memory já existente (fontes confirmadas):

- **Pipefy pipes**: Central de Projetos (`311473812`), NPS, Configurações Financeiras (`pw3daco_`), Squads (`A5RCtMH5`)
- **APIs**: Oxy Finance (revenue/MRR), Pipefy GraphQL
- **Tabelas DB**: `funnel_metas`, `monetary_metas`, `closer_metas`, `mrr_base_monthly`, `daily_revenue`, `sales_realized`
- **Edge Functions bridges**: `query-external-db`, `pipefy-sync`, `oxy-finance-sync`
- **Planilhas fallback**: Google Sheets "Indicadores 26" (somente quando aplicável)

### Arquivos afetados

Novos:
- `src/components/planning/cs/DataSourceInfo.tsx`
- `src/components/planning/cs/dataSources.ts`

Editados (inserção de tooltips, sem mudança de lógica):
- `src/components/planning/CustomerSuccessTab.tsx`
- `src/components/planning/cs/VisaoGeralCS.tsx`
- `src/components/planning/cs/OperacaoKpisStrip.tsx`
- `src/components/planning/jornada/ClientesView.tsx`
- `src/components/planning/jornada/CfoView.tsx`
- `src/components/planning/jornada/ReunioesView.tsx`
- `src/components/planning/jornada/AlertasView.tsx`
- `src/components/planning/jornada/Cliente360Drawer.tsx`
- `src/components/planning/nps/NpsScoreCards.tsx`
- `src/components/planning/nps/NpsGauges.tsx`
- `src/components/planning/nps/NpsKpiCards.tsx`
- `src/components/planning/nps/NpsDistributions.tsx`
- `src/components/planning/nps/CfoPerformanceTable.tsx`
- `src/components/planning/nps/QualitativeFeedback.tsx`
- `src/components/planning/nps/OkrProximity.tsx`
- `src/components/planning/nps/QuarterlyComparison.tsx`
- `src/components/planning/nps/ChurnDossierSection.tsx`

Sem mudanças de banco, hooks ou lógica de cálculo — só camada de informação visível.