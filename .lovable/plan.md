## Mudança na tabela "Consolidado por categoria" (dentro do expandível)

Hoje a tabela expandida "Consolidado por categoria" mostra 12 colunas numéricas: Leads, MQLs, Em contato, Quentes, Fechados, Conv%, Perdidos, MRR, Setup, Pontual, TCV, Ticket médio.

Vamos deixar visível somente **6 colunas**, todas clicáveis, mantendo os drill-downs já existentes:

| Coluna | Drill-down |
|---|---|
| Leads | abre lista completa (tab "Todos") |
| MQLs | abre tab "MQLs" |
| Em contato | abre tab "Em contato" |
| Quentes | abre tab "Quentes" |
| Vendas | abre tab "Vendas" (fechados) |
| TCV | abre tab "Vendas" (fechados) |

Colunas removidas da tabela: Fechados (duplicava Vendas), Conv%, Perdidos, MRR, Setup, Pontual, Ticket médio. Esses números continuam disponíveis dentro do drill-down expandido de cada live/categoria (`ExpandedRow`), então nenhuma informação é perdida — só sai da visão consolidada.

Aplica-se aos 3 níveis da árvore: Categoria (Live/Palestras/Eventos), Subcategoria (Talks) e Item (live/evento individual).

## Detalhes técnicos

Arquivo único: `src/components/planning/g4/G4ConsolidatedDashboard.tsx`.

1. `rowMetricCells` (linha ~981): reduzir para 6 `<ClickCell>` — Leads, MQLs, Em contato, Quentes, Vendas (`m.fechados` → drill "ganho"), TCV (`m.tcv` → drill "ganho"). Remover as demais células.
2. `<thead>` da tabela (linhas ~1121-1137): reduzir para os 6 headers correspondentes + as 2 colunas fixas (chevron + "Categoria / Live / Evento").
3. `colSpan={14}` da linha do `ExpandedRow` (linha ~1034 e outras ocorrências): ajustar para `colSpan={8}` (2 fixas + 6 métricas).

Sem mudanças em `buildTree`, `Agg`, KPIs do topo, drill-downs ou dedupe — só a projeção visual da tabela.
