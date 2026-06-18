## Objetivo
Criar acesso para `bruno.mendes@o2inc.com.br` que veja **somente a aba Operação**, com **todas as sub-abas exceto CFOs**.

## Por que não precisa mexer em código
A lógica já existe:
- `useUserPermissions` libera apenas as abas presentes em `user_tab_permissions` (não-admin não vê nada além do que tem permissão).
- Em `CustomerSuccessTab`, `canViewCfoTab = isAdmin && !isCfo` — portanto, qualquer usuário que **não seja admin** já não vê a sub-aba CFOs automaticamente.
- Não vou usar a role `cfo`, pois ela trava filtros pelo `cfo_user_mapping` (Bruno não é CFO).

## Passos

1. **Criar o usuário** via edge function `admin-create-user`:
   - email: `bruno.mendes@o2inc.com.br`
   - full_name: `Bruno Mendes`
   - senha temporária aleatória forte (gerada na hora; mostro no chat após criação)
   - role: `user` (padrão atribuído por `handle_new_user`)

2. **Conceder permissão de Operação** inserindo em `user_tab_permissions`:
   - `tab_key = 'cs'` (a aba Operação)
   - Bruno NÃO recebe `admin`, então a sub-aba CFOs ficará oculta automaticamente.
   - Demais sub-abas (Visão Geral, Pipeline, Clientes, Reuniões, Alertas, NPS) ficam visíveis.

3. **Entregar credenciais** no chat: email + senha temporária + instrução para trocar a senha no primeiro login (via "Alterar senha" no header).

## Sem mudanças de código
Nenhum arquivo será editado. Tudo é configuração de dados (auth + 1 linha em `user_tab_permissions`).

## Verificação
Após criação, confirmo via `supabase--read_query`:
- usuário existe em `auth.users` e em `profiles`
- `user_roles` contém só `'user'`
- `user_tab_permissions` contém `('<user_id>', 'cs')`
