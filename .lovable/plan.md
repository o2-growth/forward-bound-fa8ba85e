## Objetivo
Replicar no drill-down dos acelerômetros monetários (Faturamento, MRR, Setup, Pontual) o mesmo "Detalhamento por Produto Contratado" que já existe no acelerômetro **Vendas**, em vez de mostrar tudo agregado como CaaS.

## Contexto
Hoje `IndicatorsTab.tsx` (case `'venda'`) gera um `produtoExtraContent` — uma tabela que agrupa os contratos por `item.product` (categorias devolvidas por `classifyProduto`: CaaS, OXY, Assessoria, BPO, Setup, etc.) e mostra Contratos / MRR / Setup / Pontual / TCV / Ticket Médio por produto. Os outros acelerômetros monetários (`faturamento`, `mrr`, `setup`, `pontual`) já recebem `item.product` corretamente classificado via `useModeloAtualAnalytics.toDetailItem`, mas não exibem essa tabela.

## Mudanças

### `src/components/planning/IndicatorsTab.tsx`

1. **Extrair a função `buildProdutoBreakdown(items, metric)`** — uma única helper (logo antes do `switch (indicator.key)` da venda) que, dado o conjunto de items e a métrica primária (`'value' | 'mrr' | 'setup' | 'pontual'`), devolve:
   - `produtoBreakdown`: array agregado `{ produto, count, mrr, setup, pontual, value, primary }` ordenado pelo valor primário desc.
   - `produtoExtraContent`: o JSX da tabela "Detalhamento por Produto Contratado" parametrizada para destacar a coluna da métrica corrente.

2. **Reaproveitar no case `'venda'`** — substituir o bloco inline atual pela chamada `buildProdutoBreakdown(itemsWithTCV, 'value')`, mantendo o comportamento atual (TCV como métrica principal).

3. **Aplicar a tabela aos outros acelerômetros monetários**, usando `setDetailSheetExtraContent(produtoExtraContent)` em cada um:
   - `faturamento` → `buildProdutoBreakdown(items, 'value')` (Total como métrica destacada).
   - `mrr` → `buildProdutoBreakdown(mrrItems, 'mrr')`.
   - `setup` → `buildProdutoBreakdown(setupItems, 'setup')`.
   - `pontual` → `buildProdutoBreakdown(pontualItems, 'pontual')`.

4. **Resetar `extraContent`** no fallback (`default`) e nos drill-downs não monetários (ex.: SLA), para não vazar a tabela entre aberturas. Hoje só o case `venda` chama `setDetailSheetExtraContent` — incluir `setDetailSheetExtraContent(null)` nos outros casos que abrem o sheet.

## Fora do escopo
- Não mexer em `classifyProduto` nem na lógica de lookup `pipefy_db_clientes` (já produz as categorias corretas).
- Não tocar nos acelerômetros não monetários (Leads, MQLs, RMs, RRs, Propostas, SLA), nem nas BUs O2 TAX / Oxy Hacker / Franquia (os items já carregam `product` próprio).
- Sem migrações, sem novas queries, sem hooks novos.
