# Card "Qtd MQLs" — barras diárias divergem do Realizado

## Causa raiz

Em `src/components/planning/LeadsMqlsStackedChart.tsx` há **duas fontes diferentes** alimentando o mesmo card:

1. **Header "Realizado"** (`getTotalRealized`, linhas 138-160) usa os hooks de analytics de cada BU (`modeloAtualAnalytics`, `o2TaxAnalytics`, `franquiaAnalytics`, `oxyHackerAnalytics`) — aplicam as regras oficiais de MQL (faturamento mínimo, dedup mensal, exclusão de test cards, First Entry, filtro de closer).
2. **Barras diárias** (`sheetData`, linhas 122-128) usam os hooks `useModeloAtualMetas / useExpansaoMetas / useOxyHackerMetas / useO2TaxMetas` (`getGroupedData('mql', …)`), que contam entradas brutas por dia **sem** essas regras.

Além disso, o `sheetData` só suporta **uma** BU: quando `hasSingleBU === false` (é o seu caso: Franquia + Oxy Hacker marcados), a cadeia de ternários **cai no fallback `getModeloAtualGroupedData`** — ou seja, as barras que você vê são de **Modelo Atual**, não de Franquia + Oxy Hacker. Por isso aparece 6+6+1=13 nas barras enquanto o Realizado (que soma correto Franquia+Oxy Hacker) marca 4.

## Correção

Reescrever a montagem de `chartData` para:

1. **Agregar por BU selecionada**: para cada BU em `selectedBUsArray`, obter o grouped data correspondente e somar os arrays `qty` posição a posição (mesmo `grouping`, mesmo tamanho — os hooks já respeitam `startDate/endDate/grouping`).
2. **Usar a mesma fonte do header** (analytics), não os hooks de metas, para as barras — assim as regras (faturamento MQL, dedup, test cards, First Entry, filtro closer) refletem no diário. Implementação: usar `getDetailItemsForIndicator('mql')` de cada BU incluída (mais O2 TAX via `getMqlsByRevenue.flatMap(r=>r.cards).map(toDetailItem)`), aplicar filtro de closer (quando `selectedClosers` estiver ativo, hoje só se aplica em Modelo Atual — manter esse comportamento), e distribuir os itens pelos buckets:
   - `daily`: um bucket por dia entre `startDate` e `endDate`.
   - `weekly`: buckets de 7 dias.
   - `monthly`: um por mês do intervalo.
3. **Soma total = header**: garantir por asserção no dev que `sum(chartData.mqls) === totalRealized`. Se divergir, é sinal de item sem `date` — nesse caso jogar num bucket "sem data" só em log, nunca contar duplicado.
4. **Drill-down** (`handleBarClick`) já usa `getDetailItemsForIndicator('mql')` agregando por BU selecionada — manter como está; ele passará a bater com a barra porque ambos vêm da mesma fonte.
5. **Meta** permanece via `calcularMetaDoPeriodo` (não é o problema — 5 está correto e vem só das BUs incluídas).

## Arquivos

- `src/components/planning/LeadsMqlsStackedChart.tsx` — substituir `sheetData` + `buildChartData` por a nova agregação multi-BU baseada em analytics; remover imports não usados de `useModeloAtualMetas`/`useExpansaoMetas`/`useO2TaxMetas`/`useOxyHackerMetas` para `getGroupedData` (manter `getQtyForPeriod` só se ainda for necessário — no arquivo atual não é).

## Validação

- Filtrar Franquia + Oxy Hacker no período atual: soma das barras deve ser exatamente 4 (igual ao "Realizado").
- Testar também com uma BU só (Modelo Atual, O2 TAX, Franquia, Oxy Hacker) e com "all" para garantir que continua batendo com o header.
- Clicar numa barra: a lista aberta deve trazer exatamente o mesmo N que o rótulo daquela barra.
