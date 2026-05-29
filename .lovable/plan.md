# Chat IA permanente por usuário

Transformar as 2 análises one-shot (`analyze-cliente-360`, `analyze-churn-tratativa`) em conversas persistentes, atreladas ao `auth.uid()`, com follow-ups via nova edge function `ai-chat`. Entrega em 5 commits independentes.

## Restrições firmes

- Migration **aditiva apenas** (CREATE TABLE/INDEX/POLICY). Nenhum DROP/UPDATE/DELETE em tabelas existentes.
- `analyze-cliente-360` e `analyze-churn-tratativa` **não são tocadas** — continuam gerando a primeira análise.
- Modelo continua `gemini-2.5-flash` via `GEMINI_API_KEY`.
- Janela máxima de 20 mensagens enviadas ao modelo (system sempre + N mais recentes).
- RLS estrita: `user_id = auth.uid()` em SELECT/INSERT/UPDATE/DELETE.

## Fase 1 — Banco (commit 1)

Migration nova, somente criação.

**`ai_conversations`**
- `id uuid PK default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `context_type text not null` — `'cliente_360' | 'churn_tratativa'` (extensível)
- `context_key text not null` — identificador do contexto (ID Pipefy real, ou título quando sintético)
- `title text`
- `created_at`, `updated_at timestamptz default now()`
- `message_count int default 0`
- `is_archived boolean default false`
- Índice único parcial `(user_id, context_type, context_key) WHERE is_archived = false` → garante 1 conversa ativa por contexto/usuário, mas permite múltiplas arquivadas após "Regenerar".

**`ai_messages`**
- `id uuid PK`
- `conversation_id uuid not null references ai_conversations(id) on delete cascade`
- `role text not null check (role in ('user','assistant','system'))`
- `content text not null`
- `metadata jsonb` — modelo, tokens, payload do dossiê na 1ª msg
- `created_at timestamptz default now()`
- Index `(conversation_id, created_at)`

**GRANTs** (obrigatório no mesmo migration):
- `SELECT, INSERT, UPDATE, DELETE` em ambas para `authenticated`
- `ALL` para `service_role`
- Sem GRANT para `anon`

**RLS** (todas com `user_id = auth.uid()` direto em `ai_conversations`; em `ai_messages` via `EXISTS` na conversa do user):
- Policies SELECT/INSERT/UPDATE/DELETE em `ai_conversations` escopadas por `auth.uid()`.
- Policies em `ai_messages` checando ownership da conversa-pai.

**Trigger** `update_conversation_on_message` AFTER INSERT em `ai_messages`:
- incrementa `message_count`
- seta `updated_at = now()` em `ai_conversations`

## Fase 2 — Edge function `ai-chat` (commit 2)

Nova função `supabase/functions/ai-chat/index.ts`. Não altera as existentes.

Comportamento:
1. Lê JWT do header, resolve `user_id`.
2. Body: `{ conversation_id, user_message }`.
3. Valida ownership de `conversation_id` (`user_id = auth.uid()`).
4. Carrega histórico ordenado: sempre a msg `system` + últimas 19 mensagens não-system.
5. Insere a nova msg `user`.
6. Chama Gemini 2.5 Flash via `GEMINI_API_KEY` com `[system, ...history, user_message]`.
7. Insere resposta como `assistant` (com `metadata: { model, prompt_tokens, completion_tokens }`).
8. Retorna `{ assistant_message, conversation_id }`.

CORS padrão. Tratar 429/402 vindos do Gemini com mensagens claras.

## Fase 3 — Hooks adaptados (commit 3)

**`useCliente360.ts`** e **`useChurnTratativaAnalysis.ts`** passam a retornar `{ conversation, messages, isLoading, sendMessage, regenerate }`.

Fluxo ao montar (drawer aberto):
1. Query `ai_conversations` por `(user_id, context_type, context_key, is_archived=false)`.
2. Se existe → busca `ai_messages` e devolve.
3. Se não existe:
   - Chama a edge function original (`analyze-cliente-360` ou `analyze-churn-tratativa`) — comportamento atual preservado.
   - Cria `ai_conversations` row.
   - Insere 2 mensagens: `role='system'` (system prompt usado pela edge original, replicado client-side para garantir consistência nos follow-ups) e `role='assistant'` (texto da análise + dossiê em `metadata`).
4. `sendMessage(text)` → invoca `ai-chat`.
5. `regenerate()` → `UPDATE` setando `is_archived=true` na conversa atual, depois roda fluxo de criação novamente (gera nova conversa do zero; histórico antigo preservado).

`context_key`:
- Cliente 360 → `realId` (id Pipefy do card, já calculado no hook).
- Churn → `clienteId` quando real, senão `synthetic:<titulo normalizado>` para registros placeholder.

`context_type` correspondente: `'cliente_360'` e `'churn_tratativa'`.

System prompts: extraídos das 2 edge functions existentes e duplicados em um módulo cliente compartilhado (`src/lib/aiSystemPrompts.ts`) só para uso na criação inicial da conversa. Como instrução explícita: não alteramos as edge functions, então copiamos textualmente.

## Fase 4 — UI do chat (commit 4)

Novo componente `src/components/ai-chat/AIChatDrawer.tsx`, reutilizável:
- Props: `open`, `onClose`, `contextType`, `contextKey`, `title`, `subtitle`/badges, optional `initialDossie` para o painel JSON debug.
- Usa shadcn `Sheet` (mesmo padrão dos drawers atuais).
- Lista de mensagens: assistant à esquerda com markdown (`react-markdown` já está em uso nos componentes existentes — verificar `package.json` e reaproveitar; caso não esteja, manter renderer manual igual ao atual `renderAnalysis`).
- Mensagens `system` ocultas.
- Input + botão enviar no rodapé; Enter envia, Shift+Enter quebra linha.
- Estado "digitando…" durante chamada à `ai-chat`.
- Header: badge de contexto, botão "Regenerar análise" (confirmação leve), botão fechar.
- Auto-scroll para a última mensagem; manter painel `<details>` do dossiê (igual ao atual) abaixo da 1ª mensagem assistant quando `metadata.dossie` existir.

Substituir uso em:
- `src/components/planning/jornada/Cliente360Drawer.tsx` → renderiza `AIChatDrawer` com `contextType='cliente_360'`.
- `src/components/planning/cs/ChurnAnalysisDrawer.tsx` → idem com `contextType='churn_tratativa'`. Para registros sintéticos (`isSynthetic`), continuar mostrando o aviso atual e desabilitar input.

Drawers existentes ficam como wrappers finos (props → AIChatDrawer) para preservar locais de chamada.

## Fase 5 — Hub `/chats` (opcional, commit 5)

Rota nova protegida por `ProtectedRoute`:
- Lista conversas do user (não arquivadas primeiro, depois arquivadas colapsadas), agrupadas por `context_type`.
- Click reabre `AIChatDrawer` no contexto certo (renderiza componente diretamente, não dependente de dados do dashboard).
- Filtro por busca no `title`.
- Sem deleção (mantém histórico).

## Verificação após cada commit

- `tsc` (typecheck) — não fazer push se quebrar.
- Commit 1: rodar linter Supabase, validar RLS testando com 2 usuários (`supabase--read_query` simulando).
- Commit 2: deploy + `curl_edge_functions` smoke test.
- Commit 4: abrir drawers no preview, validar criação automática + envio de follow-up.

## Detalhes técnicos

- Tabelas usam apenas timestamps padrão; trigger reaproveita padrão de `update_updated_at_column` existente, mas como precisa incrementar contador, criamos `update_conversation_on_message()` dedicado.
- `ai-chat` usa cliente Supabase com JWT do usuário (não service-role) para inserts, garantindo que RLS valide ownership em runtime, não só na app.
- Histórico para o modelo: 1 msg `system` + até 19 últimas `user`/`assistant` em ordem cronológica.
- Cache TanStack Query: chaves passam a ser `["ai-chat", contextType, contextKey, userId]`; `invalidate` no envio/regenerar.
