## Objetivo
No `/dash-g4`, as Aulas Traction estão hoje agrupadas junto com o Connect em **Palestras › Talks**. Vou separá-las numa subcategoria própria **Palestras › Traction**, mantendo Connect isolado em **Palestras › Talks**.

## Mudanças

1. **`src/components/planning/g4/canonLive.ts`** — função `classifyG4Event`:
   - Reordenar as regras para que "traction" seja avaliado antes de "connect"/"talk"/"live"/"aula".
   - Traction → `{ categoria: "Palestras", subcategoria: "Traction" }`.
   - Connect → continua em `{ categoria: "Palestras", subcategoria: "Talks" }`.
   - Demais regras (live, talk, palestra, evento) inalteradas.

2. **Sem outras alterações**: a árvore do dashboard é data-driven (`G4ConsolidatedDashboard.tsx` monta as subcategorias a partir do que `classifyG4Event` retorna), então a nova subcategoria "Traction" aparece automaticamente ao lado de "Talks" dentro de Palestras, com seus próprios KPIs e drill-down.

## Resultado esperado
Palestras
- Talks (Connect)
- Traction (Aulas Traction)