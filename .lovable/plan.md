## Objetivo
Enriquecer o chat de IA da Operação (drawer **Cliente 360**) com o histórico de mensagens do Slack do canal `interno-<cliente>`, vindo do PostgreSQL externo (178.156.153.28/workana). Somente leitura, sem alterar estrutura nem dados do banco Slack.

## Arquitetura proposta

```text
Drawer Cliente 360
  └─ analyze-cliente-360 (edge fn) ── monta dossiê (já existe)
        + NOVO: busca slack_context(cliente) → anexa ao JSON do dossiê
  └─ ai-chat (edge fn) ── follow-ups
        + NOVO: action "buscar_slack" para puxar mais mensagens sob demanda
```

Toda a leitura do PG externo fica em **edge functions** (já temos `query-external-db` + secrets `EXTERNAL_PG_*`). Criamos **um novo secret** apontando para o PG do Slack, ou reaproveitamos a mesma instância se for o mesmo host. Como as credenciais são diferentes, criar secrets dedicados:

- `SLACK_PG_HOST = 178.156.153.28`
- `SLACK_PG_PORT = 5432`
- `SLACK_PG_DATABASE = workana`
- `SLACK_PG_USER = postgres`
- `SLACK_PG_PASSWORD = 58ec6378e62a74eab4df982d96f732ba`

## Mudanças

### 1. Nova edge function `query-slack-db` (read-only)
Espelho enxuto de `query-external-db`, mas conectando ao PG do Slack e expondo apenas 3 actions:

- `find_channel({ cliente })` → resolve `slack_channels` pelo padrão `interno-<slug>` com normalização (lower, trim, sem acentos, troca espaço por `-`). Retorna `{ channel_id, channel_name, member_count }` ou `null`.
- `recent_messages({ channel_id, limit=50, since_ts? })` → últimas N raízes + 1ª camada de replies, ordenadas por `ts::numeric`.
- `search_messages({ channel_id?, query, limit=50 })` → `ILIKE %query%` em `slack_messages.text` e `slack_thread_replies.text`, devolve `{channel_name, when, username, text, thread_ts}`.

Whitelist rígida de actions; nada de SQL livre. Validação Zod do body. JWT obrigatório (`verify_jwt = true` default).

### 2. `analyze-cliente-360` — anexar contexto Slack ao dossiê
Depois de obter `cliente360`, derivar `slugCliente` a partir do nome no dossiê (mesma normalização do item 1) e:

1. Chamar internamente a lógica `find_channel` (importada como helper compartilhado em `supabase/functions/_shared/slack.ts`) — sem fazer round-trip HTTP.
2. Se achou canal, puxar **últimas 30 mensagens raiz dos últimos 60 dias** + replies da thread quando `reply_count > 0` (limite global ~200 linhas para não estourar contexto).
3. Anexar bloco `slack` ao JSON do dossiê:
   ```json
   "slack": {
     "channel": { "id": "...", "name": "interno-genio", "member_count": 12 },
     "window": { "days": 60, "messages_count": 187 },
     "messages": [ { "when": "...", "username": "...", "text": "...", "thread_ts": "..." }, ... ]
   }
   ```
4. Se não achou canal: `"slack": { "channel": null, "reason": "no_channel_match" }`.

O system prompt do `analyze-cliente-360` ganha um parágrafo curto: "Quando houver bloco `slack` no JSON, usar como evidência textual de interações operacionais; citar `username + data` ao referenciar uma mensagem; nunca inventar mensagens."

### 3. `ai-chat` — follow-ups com busca sob demanda
Para perguntas tipo "o que o cliente falou sobre cobrança?" no follow-up, o dossiê inicial pode não conter a mensagem. Solução enxuta sem tool-calling pesado:

- Antes de chamar o gateway, fazer **pré-detecção** simples: se a `user_message` casar regex `slack|disse|falou|mensagem|chat|reclam`, e `conv.context_type === 'cliente_360'`, chamar `search_messages({ channel_id, query: <termo extraído da pergunta>, limit: 30 })` e injetar o resultado como mensagem `system` adicional ("Resultado de busca no Slack para '<termo>': ...") **apenas neste turno** (não persiste em `ai_messages`).
- `channel_id` é recuperado lendo a metadata da 1ª `ai_messages.assistant` (já guarda `metadata.cliente360` — ler `.slack.channel.id`).
- Se não achar termo claro, pular a busca (fail-soft).

Isso evita complexidade de function-calling mantendo o efeito prático.

### 4. UI (`Cliente360Drawer.tsx`)
- Pequeno chip no topo: `🔗 Slack: #interno-genio (187 msgs/60d)` quando há canal, ou `🔗 Slack: canal não encontrado` em cinza.
- Nenhuma mudança no fluxo de chat existente.

## Segurança / restrições
- Somente `SELECT` no PG do Slack (queries parametrizadas, sem string concat).
- Actions são whitelist; nada de SQL livre do cliente.
- Limites: `limit ≤ 200` em todas as queries.
- Auth JWT obrigatório nas edge functions.
- Sem mudança em schema/dados do PG externo.

## Detalhes técnicos
- Reaproveitar `pg@8.13.1` (já em uso em `analyze-cliente-360`).
- Helper compartilhado `supabase/functions/_shared/slack.ts` com `findChannelForCliente`, `fetchRecentMessages`, `searchMessages` — usado tanto pela função pública `query-slack-db` quanto in-process por `analyze-cliente-360` e `ai-chat`.
- Normalização do slug do cliente: `nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/[^a-z0-9]+/g,'-')` e comparar com `regexp_replace(replace(name,'interno-',''), ...)` no SQL, com fallback de `ILIKE '%slug%'`.
- O resultado da busca Slack no turno follow-up vai como **mensagem system efêmera** (não persistida) para não inflar o histórico salvo.

## Fora de escopo
- Sincronização/escrita no PG do Slack.
- Resumo automático longo prazo das conversas Slack (pode vir em iteração futura).
- Integração com churn-tratativa (mesma técnica é replicável, mas faremos só Cliente 360 nesta entrega).

## Perguntas (caso queira ajustar antes de eu construir)
1. Janela default do contexto Slack inicial: **60 dias / 200 msgs** ok, ou prefere outro?
2. Quer o chip visual no drawer mostrando o canal vinculado?
3. O nome do cliente para casar com `interno-<slug>` vem de qual campo do dossiê? (vou assumir o nome principal que já aparece no header do drawer; se houver campo "slack_channel" no Pipefy me avise para usá-lo direto e dispensar a heurística).
