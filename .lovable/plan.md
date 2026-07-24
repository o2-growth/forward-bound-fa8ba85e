## O que muda

### 1. Dash G4 (`/dash-g4` e aba G4) — filtro de data igual aos outros dashboards
- Trocar os pills fixos `30d / 90d / Tudo` do header de `G4ConsolidatedDashboard.tsx` pelo `DateRangePickerGA` (mesmo componente usado em Indicadores Comercial, CS, CEO, Growth, Marketing).
- Adicionar preset padrão "Últimos 90 dias" para não quebrar o comportamento atual, mas com botões rápidos (7d/30d/90d/Este mês/Este trimestre/Tudo) e seleção livre de intervalo.
- O filtro passa a atuar sobre `group.data` (data canônica da live/evento) — hoje é o `range` calculado por `cutoff` no `useMemo` das linhas ~825-833. Substituir pelo range `[from, to]` do picker.
- Mantém o filtro categoria (Todos / Lives / Eventos) do lado esquerdo.

### 2. Investigação "Quentes = 0"
Rodar (em build mode) via edge function `query-external-db` uma agregação em `g4_leads_360` por `temperatura` para responder objetivamente: existe lead com `temperatura = 'Quente'` na base G4 hoje?
- Se **não existe nenhum** → a tag simplesmente não está sendo preenchida no Pipefy para leads G4. Documentar no card do KPI um hint tipo "Sem tag de temperatura preenchida no Pipefy" quando `totals.quentes === 0` e existirem leads sem tag (`Sem tag > 0` no gráfico Temperatura).
- Se **existe mas não aparece no dash** → checar filtro (`isG4Attributed`, `isG4Sale`, `isWon`) que hoje exclui ganhos/vendas dos Quentes; ajustar se estiver excluindo demais.
Deliverable: uma breve nota no chat com o resultado + eventual ajuste de código só se a causa for filtro (não muda a regra atual sem confirmação).

### 3. Comercial (Indicadores) — novo widget "Leads por fase"
Novo card estilo G4 acima da seção Temperatura em `IndicatorsTab.tsx`, exibindo contagem de cards **abertos** por fase canônica do funil, respeitando **todos os filtros já ativos** (BU, Closer, SDR, Origem, período).

Fases (mesma ordem/nomenclatura do `PHASE_FUNNEL_MAP` em `src/lib/marketingFunnelAggregator.ts`):
- Novos Leads
- MQL / Tentativas de contato
- RM (Reunião agendada)
- RR (Reunião realizada)
- Proposta enviada
- Assinatura

Implementação:
- Novo componente `src/components/planning/indicators/LeadsByPhaseSection.tsx` que recebe os mesmos analytics já usados por `TemperaturaSection` (`modeloAtualAnalyticsRaw`, `franquiaAnalytics`, `oxyHackerAnalytics`, `outboundAnalytics`, `o2TaxAnalytics`) + `selectedBUs`, `startDate`, `endDate`, `cardFilter`.
- Reaproveita a mesma varredura de `temperaturaAggregator.ts`: latest row por `id`, exclui `isWonPhase`, `anyRowIsLost`, `isStandbyPhase`, aplica `cardFilter`. Em vez de bucketar por temperatura, bucketa por fase canônica via um mapa `card.faseAtual → fase canônica` (mesmo `PHASE_FUNNEL_MAP` normalizado).
- Cards não-mapeados vão para "Outras fases" (com drill-down).
- Renderização: grid de KPIs clicáveis (padrão `Kpi`/`DetailSheet` já usado no arquivo). Cada KPI abre `DetailSheet` com colunas: Empresa, BU, Produto, Fase Atual, Closer, SDR, Origem, Data Entrada — mesmas do drill de temperatura.
- Colocação: dentro de um `CollapsibleBlock` novo ("Leads por fase — pipeline atual"), inserido logo antes do bloco Temperatura (linha ~3730 de `IndicatorsTab.tsx`).

## Fora do escopo
- Não mexer nas regras de contagem do funil (cumulatividade / dedup mensal) — o widget é foto do pipeline aberto, não histórico.
- Não alterar o widget mockado `LeadsByPhaseWidget.tsx` (usado em outro contexto — `PipelineTab`), para não afetar telas que ainda dependem dele.
- Não mexer em atribuição, whitelist Finders Fee ou overrides G4.

## Detalhes técnicos
- `DateRangePickerGA` já expõe `value: {from, to}` e `onChange` — usar direto, substituindo `range/setRange` + `cutoff`.
- No G4 o filtro precisa considerar `group.data` como `Date | null`; grupos sem data (ex.: bucket Finders Fee) devem sempre passar quando o range é "Tudo" e podem ser opcionalmente incluídos com um toggle "Incluir sem data" (default: on) para não perder as vendas whitelist.
- No widget novo, o filtro `cardFilter` já usado por `TemperaturaSection` é replicado 1:1 para garantir consistência com Closer/SDR/Origem.
