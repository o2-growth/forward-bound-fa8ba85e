---
name: Pessoas BU Rollup
description: CS e Corporativo são fundidos em CaaS no painel Pessoas (custo de pessoal e headcount)
type: feature
---
No painel **Pessoas** (PessoasTab + usePersonnelCostByBu):

- **CS não é uma BU.** Toda categoria DRE com sufixo "CS"/"Customer Success" é classificada como **CaaS**.
- **Corporativo (sem sufixo de BU)** — categorias dentro de "Despesas com Pessoal" tipo Pró-labore, Terceiros, RH, Financeiro, C-Level — também são roladas em **CaaS**.
- BUs visíveis: `CaaS, SaaS, TAX, Expansão, Education`.
- O bucket `Corporativo` ainda é retornado pelo hook (interface preservada) mas vem zerado; os cards "Corporativo (não-BU)" e "Composição Corporativo" só renderizam se `total > 0`.
- `timeToBu` (mapping Pipefy Time → BU) segue a mesma regra: Times CS → CaaS.

Aplicação restrita ao painel Pessoas. DRE/Financeiro continuam tratando CS como linha própria quando aplicável.
