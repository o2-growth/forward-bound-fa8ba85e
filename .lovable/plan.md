## Objetivo

Inserir uma nova seção **"Performance de Campanhas"** na aba Indicadores → Marketing, posicionada **logo abaixo do card CPV** e **acima** de tudo que existe hoje (Visão Total, Online vs Offline, Curva, Cohort, Campanhas). O conteúdo atual permanece intacto por enquanto — decidiremos depois o que remover, à medida que novas telas chegarem.

Visual inspirado no print Power BI enviado, porém adaptado ao tema dark / design tokens do projeto (sem vermelho corporativo do print; usar verde/primário + cores por canal já em uso).

## Estrutura da nova seção

### 1. Strip de KPIs no topo (6 cards)

Layout em linha (responsivo, 2/3/6 colunas conforme largura):

```text
[Meta Inv] [Google Inv] [TOTAL Inv]   [Meta Vendas] [Google Vendas] [TOTAL Vendas]
```

- Cada canal Meta/Google mostra ícone (logo simplificado já existente), label "Investimento" / "Vendas", valor grande.
- "Outros" (Outbound + Eventos + Orgânico) aparece como terceiro bloco quando houver dado — agrupando todas as fontes não-pagas/diretas.
- Os dois cards "TOTAL" recebem destaque visual (borda/gradient primary) para diferenciar dos canais.
- Valores Vendas seguem o toggle de métrica (quantidade vs R$).

### 2. Barra de controles

- À esquerda: **"Exibir por:"** seletor com opções `Data` (dia), `Semana`, `Mês`.
- À direita: **tabs de métrica** — `Investimento`, `Impressões`, `Cliques`, `Vendas`, `CPV`, `CPC`, `Faturamento`, `ROAS`, `ROI`. Tab ativa muda o que é plotado nos gráficos abaixo.
- Toggle adicional **"Quantidade ↔ R$"** (switch) — só habilita quando a métrica selecionada for Vendas/Faturamento (afeta também o KPI Vendas no strip).

### 3. Três gráficos de área (lado a lado)

Um gráfico por canal (Meta / Google / Outros), cada um com:

- Mini-header: ícone do canal + valor agregado no período.
- Área temporal (Recharts `AreaChart`) com gradient sutil na cor do canal:
  - Meta → azul (já usado no projeto)
  - Google → verde
  - Outros → laranja/âmbar
- Linha de tendência tracejada (regressão linear simples) sobreposta.
- Labels nos picos (top 3 pontos) com o valor.
- Eixo X: datas formatadas (`dd 'de' MMM` em pt-BR).

### 4. Bloco inferior em duas colunas

**Coluna esquerda — Resumo detalhado por canal:**
Tabela compacta com uma linha por canal (Meta Ads, Google Ads, Outros) e colunas:

`Investimento | Impressões | Cliques | Vendas | CPV | CPC | Faturamento | ROAS`

Header do canal em destaque (negrito + cor do canal).

**Coluna direita — "Vendas por Data e Fonte":**

- Gráfico de barras empilhadas (Recharts `BarChart` com `stackId`).
- Eixo X: datas no mesmo agrupamento do seletor "Exibir por".
- Stacks por canal nas mesmas cores.
- Labels no topo de cada barra com o total empilhado.
- Legenda no topo.

## Fontes de dados (já existem no projeto)

- **Investimento / Impressões / Cliques / CPC** por canal e por dia:
  - Meta → `useMetaCampaigns(from, to)` (insights diários agregáveis).
  - Google → `useGoogleCampaigns(from, to)`.
  - Por dia: `useInvestmentByMonth` é mensal — vamos estender para diário ou agregar a partir dos `insights` retornados pelas Edge Functions `fetch-meta-campaigns` / `fetch-google-campaigns` (já trazem breakdown). Se o breakdown diário não vier, pediremos `time_increment=1` (Meta) e granularidade `DAY` (Google) nas próprias edge functions.
- **Vendas (quantidade e R$)** atribuídas por canal:
  - Já temos `useMarketingAttribution(allAttributionCards, allCampaigns, campaignNamesMap)` que devolve `channelSummaries` com cards atribuídos a cada canal.
  - Para quantidade: contar cards na fase "Venda" (regra existente em `sales-phase-universal-definition` + dedup mensal).
  - Para R$: somar `valorMRR + valorSetup + valorPontual` (sem Educação) dos mesmos cards.
  - Série temporal por `dataAssinatura` (ou `dataEntrada` quando ausente) agrupada por dia/semana/mês.
- **Faturamento / ROAS / ROI**: derivados — `faturamento = vendas R$`, `ROAS = faturamento / investimento`, `ROI = (faturamento - investimento) / investimento`.
- **"Outros"**: cards sem `gclid`/`fbclid`/campanha identificável; agrupa Outbound, Eventos, Orgânico (sem investimento → CPV/ROAS não se aplicam, ficam "—").

## Arquivos

**Novo diretório** `src/components/planning/marketing-indicators/performance/`:

- `PerformanceByChannelSection.tsx` — orquestrador, recebe `dateRange`, `selectedBU`, dados já carregados pelo pai (não re-buscar APIs).
- `ChannelKpiStrip.tsx` — strip de 6 cards.
- `MetricControls.tsx` — "Exibir por" + tabs de métrica + toggle Qtd/R$.
- `ChannelTrendChart.tsx` — gráfico de área reutilizável (recebe canal + série).
- `ChannelSummaryTable.tsx` — tabela detalhada inferior esquerda.
- `SalesByDateSourceChart.tsx` — barras empilhadas inferior direita.
- `usePerformanceByChannel.ts` (hook em `src/hooks/`) — recebe `metaCampaigns`, `googleCampaigns`, `allAttributionCards`, `dateRange`, `granularity`, `metric`, `valueMode` e devolve `{ kpis, series, summary }` memoizado.

**Editar** `src/components/planning/MarketingIndicatorsTab.tsx`:

- Importar `PerformanceByChannelSection` e renderizar logo após o `CacTotalCard` (CPV) e antes da `OnlineOfflineSection`.
- Passar props já existentes no escopo: `dateRange`, `selectedBU`, `metaCampaigns`, `googleCampaigns`, `allAttributionCards`, `campaignNamesMap`.

**Possível ajuste em edge functions** (só se breakdown diário não vier hoje):

- `supabase/functions/fetch-meta-campaigns/index.ts` — adicionar `time_increment: 1` opcional.
- `supabase/functions/fetch-google-campaigns/index.ts` — adicionar `segments.date` opcional.

Investigarei o payload atual primeiro; se já houver granularidade suficiente, não alteraremos edge functions nesta etapa.

## Detalhes visuais

- Card raiz: `Card` shadcn com `border-border/40` e leve `bg-card/50`.
- Título: `Performance por Canal` + subtítulo `Investimento, vendas e tendência por origem`.
- Cores: usar tokens (`hsl(var(--chart-1..4))`) e cores já estabelecidas para Meta/Google em `marketingChannelGroup.ts`.
- Animações: fade-in sutil ao trocar de métrica (`transition-opacity duration-300`).
- Sem hardcode de `text-white`/`bg-black`.
- Mantém comportamento do filtro de BU do topo (`selectedBU`) — todos os dados respeitam o filtro.

## Fora do escopo (próximas telas que você trará)

Outras visões do dashboard (cohort, online/offline novo, etc.) ficam para os próximos pedidos — uma tela por vez, como combinado.