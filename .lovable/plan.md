
## Mudança

Redefinir **MQL** no `G4ConsolidatedDashboard` para alinhar com o critério comercial de Modelo Atual: **faturamento mensal ≥ R$ 200 mil**, usando o campo `faixa` já disponível no lead (vem do diagnóstico ou do Pipefy via `g4-metrics`).

Regra: lead é MQL se `faixa` estiver em uma destas categorias:
- `Entre R$ 200 mil e R$ 350 mil`
- `Entre R$ 350 mil e R$ 500 mil`
- `Entre R$ 500 mil e R$ 1 milhão`
- `Entre R$ 1 milhão e R$ 5 milhões`
- `Acima de R$ 5 milhões`

Leads sem `faixa` preenchida (nunca fizeram diagnóstico nem entraram no pipe) → **não** contam como MQL.

## Aplicação

- `src/components/planning/g4/G4ConsolidatedDashboard.tsx`
  - Novo helper `isMqlByFaturamento(faixa)`.
  - `buildGroups` passa a usar essa regra em `mqls`.
  - Ajustar rótulo do KPI para `MQLs (≥ R$ 200k/mês)` e o hint `X% dos leads`.

Não altero a definição em `G4RealSection` nem no `LiveDetailDialog` — muda só no dashboard consolidado, que é o escopo desta pergunta.
