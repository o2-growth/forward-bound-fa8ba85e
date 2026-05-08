## Problema

A análise IA volta com tudo zerado (NPS, setup, central, rotinas, tratativas) porque a edge function `analyze-cliente-360` está chamando `get_cliente_360(id)` com o **ID errado**:

- **Frontend envia**: `cliente.id` = ID do card de **Central de Projetos** (ex: `1280100240` para WE do Brasil), construído em `useJornadaData.ts` a partir de `pipefy_central_projetos."ID"`.
- **Função espera**: o ID do registro em `pipefy_db_clientes."ID"` (parâmetro `p_cliente_id bigint`).

Como esses IDs não batem, a função só retorna o bloco `metricas` (que faz `COUNT` em `pipefy_central_projetos WHERE infos_do_cliente_database = id::text` — não encontra nada) e os outros blocos voltam vazios. O Gemini então responde corretamente "tudo zerado", mas o problema é de mapeamento, não de dados.

A relação correta no banco: `pipefy_central_projetos.infos_do_cliente_database` → `pipefy_db_clientes."ID"`.

## Solução

Resolver o ID **server-side** na edge function, aceitando qualquer um dos dois e mapeando antes de chamar `get_cliente_360`. Mantém o frontend intocado.

### Alteração em `supabase/functions/analyze-cliente-360/index.ts`

Antes de chamar `SELECT get_cliente_360($1)`:

1. Tentar primeiro tratar `clienteId` como ID de `pipefy_db_clientes`:
   - `SELECT 1 FROM pipefy_db_clientes WHERE "ID" = $1::bigint LIMIT 1`
2. Se não existir, tratar como ID de projeto e resolver:
   - `SELECT infos_do_cliente_database FROM pipefy_central_projetos WHERE "ID" = $1::bigint AND infos_do_cliente_database IS NOT NULL LIMIT 1`
3. Se ainda não achar, tentar fallback via `pipefy_card_connections`:
   - `SELECT connected_card_id FROM pipefy_card_connections WHERE card_id::text = $1 AND LOWER(connected_pipe_name) LIKE '%clientes%' LIMIT 1`
4. Se nenhuma rota resolver, retornar 404 com mensagem clara: `"Cliente não vinculado a um registro em DB Clientes"`.
5. Chamar `get_cliente_360(resolvedId)` e seguir o fluxo normal.

Adicionar `console.log` indicando qual rota resolveu o ID (debug).

## Resultado esperado

- Clicar no Sparkles do WE do Brasil agora retorna `cliente_db`, `central_projetos`, `setup`, `tratativas`, `nps`, `rotinas` populados.
- O Gemini gera diagnóstico real baseado nos dados de processo.
- Cache de 1h por `clienteId` continua funcionando (chave permanece o ID do projeto enviado pelo frontend).

## Fora do escopo

- Não tocar no `useJornadaData.ts` nem em nenhum componente do frontend.
- Não alterar a função SQL `get_cliente_360`.
