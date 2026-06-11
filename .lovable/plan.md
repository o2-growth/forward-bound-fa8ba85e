## Problema

No `CommercialPaceDashboard` (Visão Pace do Comercial), a contagem de **MQL** está menor do que o acelerômetro do indicador MQL no mesmo período.

## Causa raiz

Para todas as BUs (Modelo Atual, O2 TAX, Franquia, Oxy Hacker), o MQL é qualificado pela **data de criação** do card (`dataCriacao` cair no período), enquanto os demais indicadores usam `dataEntrada` (entrada na fase).

- `getRealizedForIndicator('mql')` → conta cards cujo `dataCriacao` está no período → bate com acelerômetro ✅
- `getDetailItemsForIndicator('mql')` → retorna os mesmos cards, **mas** o `DetailItem.date` é preenchido com `dataEntrada` (não `dataCriacao`).
- No `CommercialPaceDashboard`, o `indexOfDay(item.date)` indexa por dia dentro do período usando `item.date`. Como `dataEntrada` do MQL pode estar **fora do intervalo** (ex.: card foi criado dentro do período mas só entrou na fase MQL depois), o item retorna `idx = -1` e **não é contado** em nenhum dia → total do funil/curva fica abaixo do acelerômetro.

## Correção (mínima, só no componente do pace)

Arquivo: `src/components/planning/indicators/CommercialPaceDashboard.tsx`

1. No loop de agregação por closer (linhas ~138-146), para `def.key === "mql"`, usar **`item.dataCriacao ?? item.date`** ao calcular o índice do dia.
2. Mesma regra ao montar a série diária do gráfico de evolução (qualquer reduce que use `item.date` para MQL) — usar `dataCriacao` como data efetiva do MQL.
3. Itens MQL cujo `dataCriacao` ainda assim caia fora do intervalo (raro, mas possível por timezone) → atribuir ao primeiro/último dia do período para não sumir do total. Simples: se `idx < 0`, usar `0` (primeiro dia).

Resultado: `sum(closers.map(c => c.mql))` passa a igualar `getRealizedForIndicator('mql')` (= valor do acelerômetro), preservando o detalhamento por closer e por dia.

## Fora de escopo

- Não mexer em `useModeloAtualAnalytics` / `useO2TaxAnalytics` / `useExpansaoAnalytics` (a semântica de `DetailItem.date = dataEntrada` é usada em outras telas).
- Não alterar metas, drill-down ou outras métricas do pace (RM, RR, Prop, Venda continuam usando `dataEntrada`).
