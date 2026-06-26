## Diagnóstico — Visão CEO vs. demais abas

Revisei `src/components/planning/CeoViewTab.tsx` e comparei com `IndicatorsTab` (Comercial), `MarketingIndicatorsTab` e `CustomerSuccessTab`. Os totais **não batem** com o Comercial em vários pontos. Resumo dos furos encontrados:

### 1. Comercial — Vendas / Faturamento / MRR novo / ARR
A Visão CEO soma **apenas 4 BUs** (Modelo Atual, O2 TAX, Franquia, Oxy Hacker) via `useXxxMetas.getQtyForPeriod("venda")` / `getValueForPeriod("venda")`.

O acelerômetro Comercial inclui também:
- **Outbound** (`useOutboundAnalytics` → `getCards("venda")`)
- **Funil de Monetização** (`useMonetizacaoAnalytics`, somente fase `Concluído`)

→ Resultado: Total de vendas, Faturamento, MRR novo e ARR na Visão CEO ficam **menores** do que no Comercial sempre que houver vendas Outbound ou ganhos no funil Monetização no período.

### 2. Aquisição & Marketing — MQLs / Custo por MQL
A Visão CEO calcula MQLs como soma dos 4 `getQtyForPeriod("mql")`. Faltam:
- **Outbound MQLs** (incluídos no acelerômetro Comercial)
- Marketing tab também inclui Outbound no `pipefyVolumes` (correção feita semana passada — “200 → 761 MQLs”).

→ Total de MQLs e o **Custo por MQL** divergem da aba Marketing e do Comercial.

### 3. Aquisição & Marketing — Investimento em mídia
Hoje soma só `useMetaCampaigns + useGoogleCampaigns` direto da API. A aba Marketing usa `useMarketingSheetData` (planilha consolidada `midiaTotal`) com fallback para Meta+Google. Em períodos onde a planilha está preenchida com ajustes manuais ou outros canais (Eventos, Orgânico), os valores **não batem**.

→ CPL/CPMQL/“Melhor canal” seguem essa mesma divergência.

### 4. KPI “Faturamento” do topo
Usa `getValueForPeriod("venda")` que retorna o valor total do card. O restante do dash separa **MRR + Setup + Pontual** e **exclui “Valor Educação”** (regra Core). Precisa confirmar se `getValueForPeriod` já respeita essa regra; caso some Educação, infla o número vs. Comercial.

### 5. Operação & Churn / NPS / Pessoas
- Operação: usa `useOperationsData().kpis` — **mesma fonte** da aba Operação. ✅ bate.
- NPS: lê **constantes hardcoded** (`NPS_METRICS`, `NPS_DISTRIBUTION`) com snapshot Q4/2025. Não responde ao filtro de período e diverge da aba NPS quando há dados novos.
- Pessoas: usa `useHrData` — mesma fonte da aba Pessoas. ✅ bate.

---

## Plano de correção

Arquivo único: `src/components/planning/CeoViewTab.tsx`.

1. **Incluir Outbound e Monetização no bloco Comercial**
   - Adicionar `useOutboundAnalytics(startDate, endDate)` e `useMonetizacaoAnalytics(startDate, endDate)`.
   - Em `comercial`:
     - Acrescentar linha `{ key: "Outbound", qty: outbound.getCards("venda").length, value: soma(valor) }` ao `buSales`.
     - Somar ao total: `monetizacao.totals.valorGanho` (já filtra fase `Concluído`) e `monetizacao.totals.cardsGanhos` para qty.
   - `totalSales` e `totalRevenue` passam a refletir o acelerômetro Comercial.

2. **MRR novo / ARR**
   - Manter Modelo Atual + O2 TAX como hoje (regra do projeto), mas garantir que a Visão CEO use os mesmos getters do acelerômetro (`getMrrForPeriod`) — já está correto. Adicionar comentário explicando a regra.

3. **MQLs e Custo por MQL (Aquisição)**
   - Em `aquisicao.totalMqls`, somar também `outbound.getCards("mql").length`.
   - Recalcular `custoMql = mediaInvestment / totalMqls` com o novo total.

4. **Investimento em mídia / CPL**
   - Trocar o cálculo de `mediaInvestment` para usar `useMarketingSheetData({ startDate, endDate }).midiaTotal` quando disponível, com fallback `metaSpend + googleSpend`.
   - `channels` continua mostrando Meta/Google detalhado (API), mas o KPI de cima passa a refletir o valor da aba Marketing.

5. **Faturamento (KPI de topo)**
   - Validar com uma consulta rápida se `getValueForPeriod("venda")` exclui “Valor Educação”. Se não, trocar por soma explícita de MRR + Setup + Pontual dos BUs (mesma fórmula usada nos gauges monetários). Caso já exclua, manter.

6. **NPS no topo e na seção**
   - Trocar a fonte de `NPS_METRICS/NPS_DISTRIBUTION` (constantes Q4/25) por `useNpsData()` filtrado pelo período selecionado, mesma fonte da aba NPS. Manter fallback para o snapshot se o hook estiver vazio no período.

7. **Relatórios (PDF)**
   - `sectionAquisicao`, `sectionComercial` e `sectionNps` passam a usar os novos valores automaticamente (já leem do `useMemo`).

### Itens técnicos
- Dependências dos `useMemo` precisam incluir os novos hooks (`outboundAnalytics`, `monetizacaoAnalytics`, `sheetData`).
- Nenhuma mudança em hooks/back-end: só consumo na tela CEO.

## Pergunta de validação
Pode prosseguir com a inclusão de **Outbound + Monetização (apenas Concluído)** nos totais comerciais e com a troca do NPS para a fonte dinâmica? Ou prefere que eu **só sinalize as divergências** sem alterar a tela?
