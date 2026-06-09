# Criar usuário joao.soares@o2inc.com.br

## O que será feito

1. **Criar usuário** no Auth (Lovable Cloud):
   - Email: `joao.soares@o2inc.com.br`
   - Senha: `Alterar@01`
   - Email já confirmado (sem necessidade de verificação)

2. **Trigger automático** `handle_new_user` criará:
   - Registro em `profiles`
   - Role padrão `user` em `user_roles`

3. **Conceder permissões de aba** em `user_tab_permissions`, somente para:
   - `indicators` (Indicadores Comerciais)
   - `marketing_indicators` (Indicadores de Marketing)
   - `sales` (planejamento Comercial)
   - `marketing` (planejamento Marketing)

Nenhuma outra aba será liberada — usuário NÃO terá acesso a admin, financial, cs, nps, jornada, structure, goals, monthly, media, context.

## Como será executado

- Edge function ou inserção direta via Auth Admin API para criar o usuário com senha definida.
- `INSERT INTO user_tab_permissions (user_id, tab_key)` para as 4 abas após captura do `user_id`.

Após aprovação, executo a criação e confirmo o acesso configurado.