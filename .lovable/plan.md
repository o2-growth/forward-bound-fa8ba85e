## Objetivo
Criar conta de acesso para **Eduardo Milani Pedrolo** (`eduardo.pedrolo@o2inc.com.br`), com senha aleatória e vínculo no `cfo_user_mapping` para que ele veja apenas a carteira dele na aba Operação (mesmo padrão dos 7 CFOs já criados).

## Execução

Vou estender a edge function `bulk-create-cfos` para processar **apenas** esse novo CFO (lista de 1 item) e re-deployar/invocar:

| Email | Nome (CFO Responsavel no Pipefy) |
|---|---|
| `eduardo.pedrolo@o2inc.com.br` | **Eduardo Milani Pedrolo** |

Operações por usuário (idênticas ao fluxo anterior):
1. **Auth**: cria user com `email_confirm: true` e senha aleatória de 14 chars (`genPassword()`).
2. **`user_roles`**: remove `user`/`admin`, insere `role = 'cfo'`.
3. **`cfo_user_mapping`**: upsert `{ user_id, cfo_name: 'Eduardo Milani Pedrolo' }`.

## Validação
- Confirmar 1 linha nova em `cfo_user_mapping` + role `cfo` em `user_roles`.
- Te devolvo a senha gerada no chat (não fica armazenada).
- Ao logar, o `ProtectedRoute` libera só a aba Operação, filtrada por `get_my_cfo_name()` cruzando com `CFO Responsavel = "Eduardo Milani Pedrolo"` no Pipefy → ele vê só o squad dele.

## Risco
- **Grafia do nome no Pipefy**: assumindo `Eduardo Milani Pedrolo` (forma usada no doc de planejamento). Se no campo "CFO Responsavel" estiver diferente (ex.: `Eduardo Pedrolo`), o mapping não bate e ele vê carteira vazia. Confirma a grafia exata? Posso seguir com **"Eduardo Milani Pedrolo"** se você não disser nada.
