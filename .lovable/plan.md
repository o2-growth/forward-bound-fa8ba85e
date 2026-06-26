
# Resultados Gerais — Dashboard interativo (estilo V4)

Replicar a tela de referência o mais fiel possível, trocando "Pedidos/Ingressos/Cupom" pelos equivalentes no nosso negócio (Vendas / Propostas / Origem) e mantendo todo o restante. Vai dentro da aba **Indicadores → Marketing**, logo abaixo do novo "Funil Comparativo por Fonte".

## Onde entra

Nova seção `OverallResultsSection.tsx` em `src/components/planning/marketing-indicators/performance/`, registrada na `MarketingIndicatorsTab.tsx`. Respeita o `dateRange` global da aba.

## Layout (espelhando o V4)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ RESULTADOS GERAIS • Período: 01/01 → 12/07                       [⚙ filtros]│
├──────────┬──────────┬───────────────┬───────────────┬──────────────────────┤
│ KPI 1    │ KPI 2    │ KPI 3         │ KPI 4         │ KPI 5                 │
│ Qtd      │ Qtd      │ Valor Vendas  │ Ticket Médio  │ % Realizado Meta      │
│ Vendas   │ Propostas│ R$ ...        │ (Venda)       │ ...% (meta R$ X)      │
│ Last Wk  │ Last Wk  │ Last Wk       │ TM Proposta   │ Last Wk: ...          │
├──────────┴──────────┴───────┬───────┴───────────────┴──────────────────────┤
│ Métricas (6 tiles clicáveis)│ por Origem (lista barras) │ Evolução temporal│
│  Qtd Vendas · TM Venda      │   Meta Ads     ...       │ [Mês/Sem/Dia ▾]  │
│  Qtd Propostas · TM Prop.   │   Google Ads   ...       │ [Vendas/Valor ▾] │
│  Valor Propostas · % Meta   │   CRM/Direto   ...       │ area chart       │
│  (clique → ativa métrica)   │   Indicações   ...       │                  │
├─────────────────────────────┼──────────────┬───────────┼──────────────────┤
│ por Cidade (barras)         │ por Origem   │ por Estado│ Tabela de Vendas │
│   São Paulo  87             │ (mesma do    │   SP 182  │ Data · Cliente · │
│   Belo Horiz 25             │  topo, aqui  │   MG  47  │ Produto · Valor  │
│   ...                       │  como mini)  │   ...     │ (paginada)       │
└─────────────────────────────┴──────────────┴───────────┴──────────────────┘
```

## Comportamento interativo

- **Filtros globais da seção** (header): período (sincronizado com a aba), Origem, Produto, BU, SDR/Closer.
- **KPIs do topo**: clique → abre `DetailSheet` listando as vendas/propostas com colunas (cabeçalho fixo, igual padrão já implementado).
- **Tiles "Métricas"**: clique seleciona qual métrica alimenta o **gráfico de evolução** (Qtd Vendas, TM Venda, Qtd Propostas, TM Proposta, Valor Propostas, % Meta). Tile ativo destacado.
- **Granularidade do gráfico**: Dia / Semana / Mês (selector).
- **Listas "por Origem / Cidade / Estado / Produto"**: cada barra é filtro cruzado — clicar filtra todas as outras visões da seção (cross-filter estilo Power BI). Botão "Limpar filtros".
- **Tabela inferior**: ordenável por coluna, paginada, exportável CSV. Linha clicável → abre o card no Pipefy (deep-link já existe em `mem://tech/pipefy/deep-linking-config-v2`).
- **Comparativo "Last Week / Last Period"**: cada KPI mostra delta vs período anterior de mesmo tamanho.
- **Meta editável**: campo "Meta de Vendas (R$)" na engrenagem do header — persistido em `marketing_overall_metas` (nova tabela leve: month/year/meta_vendas/meta_qtd) ou reusar `monetary_metas` se fizer sentido.

## Fontes de dados (o que já temos vs falta)

**Já temos no dash:**
- ✅ Qtd Vendas, Valor (MRR/Setup/Pontual), Ticket Médio, % Meta → via `salesInPeriod`, `realRevenue`, `monetary_metas`.
- ✅ Qtd Propostas + Valor Propostas → cards na fase "Proposta enviada / Follow Up" + valor do card.
- ✅ Por Origem/Fonte → `detectChannel(card)` (Meta, Google, CRM, Indicação, Evento, Orgânico).
- ✅ Por Produto → campo `produto` no AttributionCard.
- ✅ Por SDR/Closer → já filtramos hoje.
- ✅ Evolução temporal mensal → já agregamos em outras seções.
- ✅ Tabela detalhada (Data assinatura · Cliente · Qtd · Valor) → `salesCards` ordenado por `dataAssinatura`.
- ✅ Comparativo "Last Week" → calculável (mesmo intervalo deslocado).

**NÃO temos hoje (preciso confirmar antes de implementar):**
- ❌ **Cidade do lead/cliente** — campo `cidade` não existe no `AttributionCard`. Opções: (a) adicionar mapeamento do Pipefy se o pipe tem o campo; (b) puxar via Meta Ads `actions_by_region` (apenas para leads atribuídos a Meta); (c) deixar bloco oculto até termos a fonte.
- ❌ **Estado/UF** — mesma situação da cidade. Meta Ads expõe **breakdown por região** (estado BR) no insights endpoint. Para Google Ads é `geo_target_region`. Pode ser implementado **só para leads atribuídos a campanhas Meta/Google** — leads CRM/orgânicos não terão UF a menos que adicionemos no formulário.
- ❌ **"por Cupom"** — não usamos cupons. Substituir por **"por SDR" ou "por Indicador" ou "por Campanha"**. (precisa decisão)
- ❌ **% Realizado Meta de Qtd (2.000 pedidos)** — temos meta de valor (R$), não de quantidade. Adicionar campo `meta_qtd_vendas` na tabela de metas.
- ❌ **Qtd Ingressos** — não temos equivalente direto (multi-itens por venda). Estou substituindo por **Qtd Propostas** que é o que faz sentido no funil B2B.

## Implementação técnica

**Arquivos novos:**
- `src/components/planning/marketing-indicators/performance/OverallResultsSection.tsx` (orquestrador)
- `.../overall-results/KpiStrip.tsx` — 5 cards do topo com delta vs período anterior
- `.../overall-results/MetricsTilesGrid.tsx` — 6 tiles selecionáveis
- `.../overall-results/BreakdownList.tsx` — componente reusável para "por Origem / Cidade / Estado / Produto" (barras horizontais + scroll + clique)
- `.../overall-results/EvolutionChart.tsx` — area chart com seletor de métrica + granularidade
- `.../overall-results/SalesTable.tsx` — tabela paginada com header fixo
- `src/hooks/useOverallResults.ts` — agrega vendas + propostas + breakdowns + série temporal a partir de `allAttributionCards`, `salesInPeriod` e `allCampaigns`
- (opcional, se aprovado) Migration `marketing_overall_metas` com `meta_vendas_valor` e `meta_vendas_qtd` por mês

**Cross-filter:** estado local `{ origem?, produto?, cidade?, estado?, sdr? }` em `OverallResultsSection`; cada filho recebe e aplica antes de renderizar. Métricas do topo respeitam o cross-filter.

**Last week / período anterior:** o hook calcula 2× — período atual e período anterior de mesmo tamanho — e devolve `{ atual, anterior, delta% }`.

**Performance:** memoização agressiva por `dateRange` + filtros; sem novas requisições — tudo derivado de dados já carregados pela aba.

## Perguntas para destravar antes de eu construir

1. **"por Cupom"** vira o quê no nosso caso? (Sugiro **"por SDR"** ou **"por Indicador/Closer"**.)
2. **Cidade/Estado**: posso começar mostrando **apenas leads atribuídos a Meta/Google** (com breakdown geográfico vindo da API de insights) e deixar os outros como "n/d"? Ou prefere ocultar os blocos até termos o campo no formulário de captura?
3. **Meta de quantidade de vendas** (o "2.000" do print): criar campo separado em metas mensais ou só calcular a partir da meta de valor ÷ ticket médio?
4. **"Qtd Ingressos"**: confirmo a troca por **Qtd Propostas**? (alternativa: Qtd MQLs.)

Depois das respostas, parto direto para a implementação.
