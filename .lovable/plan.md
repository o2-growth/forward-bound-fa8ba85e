## 1. Reclassificar Connect e Traction como Palestras

Hoje `classifyG4Event` (em `src/components/planning/g4/canonLive.ts`) coloca em **Live** qualquer nome que contenha "live" — então "Live G4 Connect", "Aula Traction", "G4 Tools Connect", "G4-Aula-Traction-*" caem na categoria Live.

Ajuste (uma única função):

- Em `classifyG4Event`, testar `connect` e `traction` **antes** de "live":
  - `connect` → `{ categoria: "Palestras", subcategoria: "Talks" }` (encaixa em `Talks Connect` do esqueleto).
  - `traction` → `{ categoria: "Palestras", subcategoria: "Talks" }` (encaixa em `Talks Traction`).

Nenhuma outra mudança é necessária: o esqueleto em `G4ConsolidatedDashboard.tsx` (linhas 342–353) já tem os buckets `Talks Connect` e `Talks Traction` prontos para receber esses grupos.

## 2. Origem de cada venda (estado atual do /dash-g4)

Levantei direto do endpoint `g4-metrics` (funil por live) — vendas atualmente contabilizadas:

| Vendas | Evento / Live |
|---|---|
| 2 | Live G4 - 02/07/2026 |
| 2 | G4 SCALE EXPERIENCE 25/06/2026 |
| 1 | Live G4 - 20/05/2026 |
| 1 | Live G4 - 21/05/2026 |
| 1 | Live G4 - 21/07/2026 |
| 1 | G4 - G.E Junho - 20/06/2026 |
| 1 | Lotus Logística (bucket "G4 - Finders Fee (fora das lives)" — corrigido agora, aparece no próximo refresh) |

Total = **9 vendas** (bate com a whitelist Finders Fee: Martinelli, Petromar, JP Projetos, Discabos, Importadora Patagônia, Tchau Entrega, Yuri Josect, Lotus, Invenzi).

Se quiser a lista nominal por cliente aparecer na UI dentro de cada card de live, é só clicar no número de **Fechados** na tabela do Dashboard Consolidado (drill-down já existente com Empresa, Contato, Fase, Closer, link do Pipefy).

## Arquivos alterados

- `src/components/planning/g4/canonLive.ts` — regra Connect/Traction em `classifyG4Event`.

Sem mudança de backend.
