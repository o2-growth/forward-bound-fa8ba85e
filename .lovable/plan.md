## Promover Vini para admin

Conta encontrada: `vinicius.sanfelice@o2inc.com.br` (id `53ed86d1-b528-4185-818b-bd2bfe82c509`), hoje com role `user`.

### Ação
1. Remover a role `user` dele em `user_roles`.
2. Inserir role `admin` em `user_roles`.

Resultado: ele passa a ter acesso total a todas as abas (Admin no `useUserPermissions` já dá `allAdminTabs`), incluindo a aba Admin para gestão de usuários/permissões.

Sem mudanças de código — apenas dados.