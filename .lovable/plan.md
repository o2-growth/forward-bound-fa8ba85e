Reduzir colunas da tabela "Consolidado por categoria" para: **Leads · MQLs · Em contato · Quentes · Vendas · TCV** (todas clicáveis, abrem drill-down).

Remover colunas: Conv%, Perdidos, MRR, Setup, Pontual, Ticket médio.

## Mudanças em `src/components/planning/g4/G4ConsolidatedDashboard.tsx`

1. **Cabeçalho** (linhas ~1123-1137): manter `w-6`, `Categoria / Live / Evento`, `Leads`, `MQLs`, `Em contato`, `Quentes`, `Vendas`, `TCV`. Renomear "Fechados" → "Vendas".
2. **`rowMetricCells`** (linhas ~980-995): manter apenas as 6 `ClickCell` correspondentes (inscritos, mqls, emContato, quentes, fechados, tcv), removendo conv/perdidos/mrr/setup/pontual/ticketMedio.
3. **`colSpan`** da linha expandida (linha 1034): trocar `14` → `8` (1 chevron + 1 label + 6 métricas).

Sem mudanças nos KPIs de cima nem no drill-down (que já mostra MRR/Setup/Pontual/TCV para vendas).
