
# Aba Marketing — Cohort, Curva de Conversão, Online/Offline e CAC

Replicar EXATAMENTE as 4 abas da planilha Indicadores Growth dentro de `MarketingIndicatorsTab.tsx`. Sem inventar coluna, sem mudar fórmula.

## Estado atual verificado

- **Pre-fix 1 confirmado necessário**: em `MarketingIndicatorsTab.tsx` linha 259, `allAttributionCards` hoje agrega apenas Modelo Atual + Franquia + O2 TAX. Outbound não está sequer importado, e `oxyHackerCards` é buscado (linha 256) mas nunca consumido.
- **Pre-fix 2 já está feito**: os dois edge functions (`fetch-meta-campaigns` linha 273-275, `fetch-google-campaigns` linha 122-130) já removeram o filtro ACTIVE/PAUSED e o Meta já tem paginação até `CAMPAIGNS_HARD_CAP`. **Pulando este pre-fix** — apenas validar empiricamente que histórico de mês com campanha arquivada aparece.

## Entrega em 7 commits

### Commit 1 — Pre-fix attributionCards
`MarketingIndicatorsTab.tsx`:
- Importar `useOutboundAnalytics`.
- Chamar `useOutboundAnalytics(dateRange.from, dateRange.to)` → desestruturar `allCards`.
- No `useMemo` de `allAttributionCards` (linha 259): adicionar dois loops, um para `outboundAllCards` (bu: `'Outbound'`, id: `outbound_${c.id}`) e um para `oxyHackerCards` (bu: `'Oxy Hacker'`). Mesmo shape dos blocos existentes de Franquia/Modelo Atual.
- Atualizar deps do `useMemo`.

### Commit 2 — Helper de classificação
Novo `src/lib/marketingChannelGroup.ts` com `getChannelGroup(fonte?, origemLead?, tipoOrigem?): 'online' | 'offline' | 'desconhecido'` usando os tokens da spec (normalização NFD + lowercase + match por includes).

### Commit 3 — Card CAC Total + hook de investimento mensal
- Novo hook `src/hooks/useInvestmentByMonth.ts(startDate, endDate)`:
  - Consome `useMetaCampaigns(startDate, endDate)` + `useGoogleCampaigns(startDate, endDate)` UMA vez no range completo.
  - Retorna `{ totalInvestment, totalSales, byMonth: Map<'yyyy-MM', number>, isLoading }`.
  - **Limitação aceita**: como Meta/Google retornam só o total agregado do range, não conseguimos cortar por mês a partir do mesmo response. Solução: para preencher `byMonth`, o hook dispara em paralelo um `useQuery` por mês visível dentro do range (key: `['investment-month', yyyyMM]`), reutilizando o cache 60min das edge functions. Cap em 24 meses para evitar abuso.
- Novo componente `src/components/planning/marketing-indicators/CacTotalCard.tsx`:
  - Recebe `investment`, `sales` (count), `cac = investment/sales` (0 se sales=0).
  - Card grande no topo: número CAC em destaque + linha "Investimento: R$ X ÷ Vendas: N".
- Montar acima de `RevenueMetricsCards` em `MarketingIndicatorsTab.tsx`.
- Contagem de vendas: `allAttributionCards.filter(c => c.fase === 'Contrato assinado').length` (já existe lógica equivalente na linha 476 — reaproveitar).

### Commit 4 — Conversão Online vs Offline
Novo `src/components/planning/marketing-indicators/OnlineOfflineSection.tsx`:
- Recebe `allAttributionCards` + `totalInvestment` (Meta+Google do período).
- Computa por `useMemo`:
  - Para cada card, `group = getChannelGroup(card.fonte, card.origemLead, card.tipoOrigem)`.
  - Leads = cards com `fase` em `['Novos Leads', 'MQLs', 'Tentativas de contato', ...]` — para evitar reinventar, **filtrar pelos cards retornados por `getCardsForIndicator('leads')`** de cada um dos 5 hooks (já existe no componente). Combiná-los em um set por id.
  - Vendas = `c.fase === 'Contrato assinado'`.
- Topo: 2 cards (Online / Offline) com Leads, Vendas, Conversão %, Investimento.
- Embaixo: tabela por fonte (string crua de `fonte || origemLead || tipoOrigem`), colunas: Fonte, Grupo, Leads, Vendas, Taxa. Sort por Leads desc. Mostrar quem tiver Leads≥1 OR Vendas≥1.

### Commit 5 — Curva de Conversão
Novo `src/components/planning/marketing-indicators/ConversionCurveSection.tsx`:
- Filtra vendas: `c.dataAssinatura` dentro do `dateRange`, de TODAS as BUs (usa `allAttributionCards` — após Commit 1 já inclui as 5).
- Calcula `dias = floor((dataAssinatura - dataEntrada) / 86400000)` por venda.
- Topo: 2 cards grandes (Média / Mediana) + nota explicando cauda longa quando diff > 50%.
- Tabela: Cliente, Criado em, Contrato assinado, Dias até fechar. Sort desc por dias.

### Commit 6 — Cohort de Entrada
Novo `src/components/planning/marketing-indicators/CohortTable.tsx` (componente reutilizável):
- Props: `cards: AttributionCard[]`, `cohortType: 'entrada' | 'assinatura'`, `investmentByMonth: Map<string, number>`, `monthsInRange: string[]`.
- Para `'entrada'`: agrupa cards (que tenham `dataAssinatura`) por `format(dataEntrada, 'yyyy-MM')`. Investimento da safra = `investmentByMonth.get(yyyyMM)`.
- Tabela com expansão por safra usando `Collapsible`. Linha cabeçalho: Safra, Investimento, MRR Total, Setup Total, Pontual Total, Educação Total, Faturamento, CAC, # vendas. Linha de detalhe (uma por venda): Cliente, Criado em, Fonte, Produto, MRR, Setup, Pontual, Educação, Contrato assinado.
- Safras sort desc. Vendas dentro sort asc por `dataEntrada`.
- Renderizar na aba abaixo de Curva de Conversão.

### Commit 7 — Cohort de Assinatura
Reusar `CohortTable` com `cohortType="assinatura"`:
- Agrupa por `format(dataAssinatura, 'yyyy-MM')`.
- Coluna "Criado em" renderizada por último (componente decide via prop).
- Investimento da safra: para cada venda da safra, pega `format(dataEntrada, 'yyyy-MM')`, faz set único de meses de entrada, soma `investmentByMonth.get(m)` de cada um. Memoizado.
- Renderizar abaixo de Cohort de Entrada.

## Onde tudo entra (ordem final)

```text
1. PerformanceGauges (existente)
2. CacTotalCard            (Commit 3)
3. RevenueMetricsCards (existente)
4. OnlineOfflineSection    (Commit 4)
5. ConversionCurveSection  (Commit 5)
6. CohortTable entrada     (Commit 6)
7. CohortTable assinatura  (Commit 7)
8. ...resto (channel cards, campaign tables, etc.)
```

## Restrições respeitadas

- Sem edge function nova.
- Sem mexer em hooks/cálculos existentes (apenas consumir).
- Sem migration.
- Todas agregações em `useMemo`.
- Filtro de data global da aba propaga para todas as seções via `dateRange`.

## Validação manual

- Filtro = ano corrente: comparar números com planilha original.
- Filtro = Q1 2024: cohort mostra só Jan/Fev/Mar 2024.
- Curva: média/mediana batem com `mean()`/`median()` de `dataAssinatura − dataEntrada`.
- Online: soma de vendas das fontes do grupo Online = total Online do card.
- CAC = (Meta+Google) ÷ vendas.
- Vendas do Outbound (ex. Matheus Staruck) aparecem nas cohorts → confirma Pre-fix 1.

## Fora do escopo

- CPV (= CAC) por canal — fica pra depois conforme spec.
- Pre-fix 2 (já aplicado, apenas validar visualmente).
- Qualquer mudança em outras abas.
