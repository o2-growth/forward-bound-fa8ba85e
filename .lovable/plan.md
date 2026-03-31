

## Atualizar SDR do card da Vera para Carolina Boeira

### Situação atual
A edge function `query-external-db` só possui ações de leitura (preview, search, schema, count, query_period). Não existe ação de UPDATE no banco externo.

### Plano

1. **Adicionar ação `update_field` na edge function `query-external-db`**
   - Nova ação restrita a admins
   - Aceita parâmetros: `table`, `cardId`, `field`, `value`
   - Executa `UPDATE {table} SET "{field}" = $1 WHERE "ID" = $2`
   - Validação: só permite campos seguros (`SDR responsável`, `Closer responsável`) e tabelas válidas

2. **Executar a atualização via chamada à edge function**
   - Tabela: `pipefy_cards_movements_expansao`
   - Card ID: `1298234933`
   - Campo: `SDR responsável`
   - Valor: `Carolina Boeira`

### Risco
O usuário do banco externo pode não ter permissão de UPDATE. Se falhar, será necessário atualizar diretamente no Pipefy ou ajustar as credenciais do banco externo.

### Arquivo afetado

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/query-external-db/index.ts` | Adicionar ação `update_field` com validação de campo e admin-only |

