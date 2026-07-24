## Regra

Um lead marcado como **Quente** que já está em **Ganho** (ou é uma venda G4 confirmada) não deve mais contar em "Quentes" — ele já virou Fechado.

## Ajuste

Em `src/components/planning/g4/G4ConsolidatedDashboard.tsx`, trocar o filtro `l.temperatura === "Quente"` por `l.temperatura === "Quente" && !isG4Sale(l) && !isWon(l.faseAtual)` nos 4 pontos:

1. `buildGroups` (linha ~235) — contagem `quentes` do grupo.
2. `mergeGroups` (linha ~443) — merge de grupos.
3. Distribuição por temperatura (linha ~571-573) — não contar o Quente ganho no breakdown.
4. Drill-down `case "quente"` (linha ~828) — não listar ganhos.

Sem mudanças no backend.
