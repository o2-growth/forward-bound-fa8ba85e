---
name: Slack Channel Override
description: Tabela cliente_slack_channels permite vincular manualmente cliente do Pipefy a canal Slack quando heurística falha
type: feature
---
Tabela `public.cliente_slack_channels` (PK=cliente_id text) armazena override manual `cliente_id → channel_id`.
`analyze-cliente-360` consulta override antes da heurística por slug; se houver, busca o canal por ID (`findChannelById`) e marca `slack.source='override'`. Senão usa `findChannelByCandidates` e marca `source='heuristic'`.
Edge function `query-slack-db` ganhou ação `list_channels` (busca paginada por nome, prioriza `interno-*`).
UI: componente `SlackChannelPicker` (badge clicável no `Cliente360Drawer`) mostra canal atual + popover com busca/lista; salvar = upsert na tabela + `chat.regenerate()` para reconstruir o dossiê.
RLS aberta para authenticated (qualquer analista pode editar vínculos).
