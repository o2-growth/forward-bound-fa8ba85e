## Problema

Na tabela "Consolidado por categoria" a linha **Total** ainda mostra colunas extras fora do cabeçalho (Conv%, Perdidos, MRR, Setup, Pontual, TCV extra, Ticket médio) — visíveis no print como `0.5% · 85 · R$ 42.8k · R$ 147.9k · R$ 32.0k · R$ 693.3k · R$ 24.7k`.

Essas métricas deveriam aparecer apenas dentro do drill-down (sheet expandível ao clicar), não na tabela principal.

## Alteração

Em `src/components/planning/g4/G4ConsolidatedDashboard.tsx`, linha ~1180-1195, ajustar a linha **Total** para conter apenas as 6 colunas visíveis no cabeçalho (Leads, MQLs, Em contato, Quentes, Vendas, TCV), removendo os `<td>` extras de Conv%, Perdidos, MRR, Setup, Pontual e Ticket médio.

Nada muda no drill-down — as métricas monetárias detalhadas continuam disponíveis lá dentro (via `DetailSheet`).
