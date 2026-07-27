## Objetivo

No dash G4, quando o filtro de tipo está em **Todos**, os indicadores do topo (Leads, MQLs, Em contato, Quentes, Fechados, Perdidos, MRR/Setup/Pontual/TCV) devem incluir também o bucket **G4 - Finders Fee (fora das lives)** — ou seja, a Petromar volta a contar. Quando o filtro estiver em **Lives** ou **Eventos**, ela continua fora, como já corrigimos.

## Como fica

- Filtro **Todos**: KPIs = lives + eventos + Finders Fee (deduplicados por email/nome, como já é hoje).
- Filtro **Lives**: KPIs só de lives (sem Petromar).
- Filtro **Eventos**: KPIs só de eventos (sem Petromar).
- A tabela por categoria (Live / Palestras / Eventos) continua **sem** Finders Fee em qualquer filtro.
- A seção separada de Finders Fee continua existindo e respeitando só o filtro de data.

## Detalhes técnicos

Arquivo: `src/components/planning/g4/G4ConsolidatedDashboard.tsx`

- Criar um memo `kpiGroups` = grupos filtrados por data, incluindo os de `kind: "finders"` **apenas** quando `kind === "todos"`; usar esse conjunto no cálculo de `totals`.
- Manter `groups` (lives/eventos, sem finders) como fonte da árvore/tabela — `treeGroups` segue igual.
- `findersGroup` continua vindo do próprio memo com filtro de data, sem mudança.
- Nenhuma alteração na edge function `g4-metrics` nem em regras de valor/atribuição.
