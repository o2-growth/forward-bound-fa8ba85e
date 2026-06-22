## Objetivo
Criar usuário `paulo.cerqueira@o2inc.com.br` com acesso restrito a **Indicadores Comercial** e **Marketing** apenas.

## Passos

1. **Criar usuário no Auth**
   - Email: `paulo.cerqueira@o2inc.com.br`
   - Senha temporária gerada (você compartilha com ele e ele troca no primeiro login via "Recuperar senha")
   - Email já confirmado (sem etapa de verificação)
   - Trigger `handle_new_user` cria automaticamente `profiles` + role `user`

2. **Atribuir permissões de aba** (`user_tab_permissions`)
   - `indicators` → aba Indicadores (sub-aba Comercial é a default)
   - `marketing_indicators` → libera a sub-aba Marketing dentro de Indicadores
   - Sem `admin`, sem `goals`, sem `monthly`, sem `cs`, sem `financial`, sem `structure`, sem `context`

   Conforme `useUserPermissions.ts`, ter `marketing_indicators` já garante acesso à aba `indicators` automaticamente — então ele entra direto e enxerga Comercial + Marketing nas sub-abas, sem NPS, sem Growth, sem Operação.

## Detalhes técnicos
- Inserção via SQL na `auth.users` (com `crypt()` para senha) + `user_tab_permissions`.
- Role default `user` é criada pelo trigger `handle_new_user`.

## Pergunta antes de executar
Qual senha temporária você quer definir? (sugestão: eu gero uma aleatória e te entrego, ele troca no primeiro acesso)
