## Criar conta admin para icaro.santana@o2inc.com.br

1. Criar usuário via `supabase.auth.admin.createUser` (email confirmado, senha `Alterar@01`)
2. Inserir role `admin` em `public.user_roles` para o user_id criado
3. Confirmar via query que o usuário existe e tem role admin

### Detalhes técnicos
- Executar via `psql`/Supabase admin API a partir de um script Deno temporário ou via SQL direto após criar o auth user
- Como `auth.users` não aceita INSERT direto via SQL com senha hasheada de forma simples, usar a Edge Function `manage-user` (action `create`) já existente — mas ela exige admin chamador. Alternativa: script ad-hoc com SERVICE_ROLE_KEY via `supabase-js` rodando localmente no sandbox usando os secrets já configurados.
- Após criar, rodar: `INSERT INTO user_roles (user_id, role) VALUES (<id>, 'admin') ON CONFLICT DO NOTHING;` e remover role 'user' duplicada se necessário.