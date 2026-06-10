---
name: Slack context attached to Cliente 360 AI chat
description: Operação Cliente 360 anexa mensagens do canal interno-<cliente> (PG externo Slack) ao dossiê + busca on-demand em follow-ups
type: feature
---
PG externo Slack (host 178.156.153.28, db workana) tem 3 tabelas: slack_channels, slack_messages, slack_thread_replies. Credenciais nos secrets SLACK_PG_HOST/PORT/DATABASE/USER/PASSWORD. Somente leitura.

Edge function `query-slack-db` (whitelist actions: find_channel, recent_messages, search_messages). Helper compartilhado `supabase/functions/_shared/slack.ts` com normalizeSlug + extractClientSlugCandidates + findChannelByCandidates + fetchRecentMessages + searchMessages.

`analyze-cliente-360` anexa bloco `slack` (canal + últimas 30 raízes/60d + replies, máx 200 linhas) ao JSON `cliente360` antes de enviar à IA. Slug do cliente é derivado de campos nome/titulo/razao_social/fantasia/slack_channel via heurística NFD.

`ai-chat` em conversas `cliente_360`: se a mensagem do user casa regex slack|disse|falou|reclam|... e tem termo extraível (entre aspas, "sobre X", "palavra X"), busca via searchMessages e injeta como system efêmero (não persiste em ai_messages). channel_id vem de ai_messages[0].metadata.cliente360.slack.channel.id.

Drawer Cliente360Drawer exibe chip "🔗 Slack: #interno-x (N msgs/60d)" ou "canal não encontrado".

Prompt CLIENTE_360_SYSTEM_PROMPT atualizado: cita username+data ao referenciar msgs Slack; nunca inventar.
