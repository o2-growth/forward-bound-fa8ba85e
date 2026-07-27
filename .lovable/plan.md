## Problema

Na tabela do dash G4 existem 3 categorias (Live · Palestras · Eventos), mas o filtro de pílulas só tem Lives e Eventos.

Causa confirmada em `src/components/planning/g4/G4ConsolidatedDashboard.tsx`:
- linha 100: `kind: "live" | "evento" | "finders"`
- linha 309: `kind = isFinders ? "finders" : cls.categoria === "Live" ? "live" : "evento"` — ou seja, **Palestras é classificada como "evento"**.
- linhas 861/1181-1183: `KindFilter = "todos" | "live" | "evento"` e só 3 pílulas.

## Correção

1. Adicionar `"palestra"` ao tipo `LiveGroup["kind"]` e ao `KindFilter`.
2. Ajustar a classificação (linha 309) para mapear `cls.categoria`: `Live → "live"`, `Palestras → "palestra"`, resto → `"evento"` (Finders Fee segue em `"finders"`).
3. Ajustar o fallback do grupo agregado (linhas 568-569) para derivar o `kind` da categoria em vez de assumir `"evento"`.
4. Adicionar a pílula **Palestras** entre "Lives" e "Eventos" no filtro.
5. Manter o comportamento atual do Finders Fee: fora das pílulas específicas, somando nos KPIs apenas em "Todos".

## Detalhes técnicos

- Arquivo único: `src/components/planning/g4/G4ConsolidatedDashboard.tsx`.
- Os memos `groups`, `treeGroups` e `kpiGroups` já comparam `g.kind === kind`, então passam a funcionar com o novo valor sem mudança adicional.
- Nada muda nos números: é só granularidade de filtro; "Todos" continua somando as três categorias.
