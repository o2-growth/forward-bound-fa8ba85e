# Adaptação para Postgres puro — somente documentação

**Garantia**: Zero alteração em `src/`, `supabase/`, `.env`, secrets ou banco. O projeto Lovable continua 100% funcionando como hoje. Tudo que farei é **criar documentos novos** dentro de `/mnt/documents/migration/`.

## O que vou criar (apenas documentação + SQL de apoio)

Todos os arquivos abaixo são **novos**, dentro de `/mnt/documents/migration/`. Nenhum arquivo existente é alterado.

### 1. `POSTGRES_PURO_README.md`
Documento mestre explicando:
- O que funciona 1:1 do pacote atual (`01_schema.sql`, `11_data_load.sql`)
- O que precisa de adaptação (auth, RLS, edge functions)
- Ordem recomendada de import no servidor de vocês
- Checklist final de validação

### 2. `99_postgres_puro_adaptations.sql` (opcional de rodar no destino)
Script SQL **para rodar no servidor novo** (não toca neste projeto). Contém:
- `CREATE SCHEMA auth` + stub `auth.uid()` lendo de `current_setting('app.user_id')`
- `CREATE TABLE auth.users` mínima compatível com o dump de `20_auth_users.sql`
- Bloco comentado alternativo: `DISABLE ROW LEVEL SECURITY` em todas as tabelas (caso prefiram autorização na app)

### 3. `EDGE_FUNCTIONS_PORTING.md`
Guia de portabilidade das 24 edge functions Deno → Node/Bun:
- Tabela de mapeamento (`Deno.env.get` → `process.env`, `npm:@supabase/...` → npm normal, `Deno.serve` → Express/Hono, etc.)
- Classificação de cada função:
  - **Porta direto** (lógica pura): `sync-sales-data`, `sync-pipefy-funnel`, `fetch-meta-campaigns`, `fetch-oxy-finance`, `query-external-db`, `ai-chat`, etc.
  - **Precisa reescrever auth**: `create-user`, `manage-user`, `bulk-create-cfos` (usam `auth.admin.createUser` do Supabase → trocar por INSERT + bcrypt)
  - **Trocar `supabase.functions.invoke` interno por HTTP fetch direto**
- Lista de secrets necessários por função

### 4. `AUTH_MIGRATION.md`
Como migrar a autenticação:
- Hashes bcrypt do `20_auth_users.sql` são portáveis (NextAuth, Lucia, Better-Auth, código próprio)
- Como recriar o equivalente de `has_role()` no Postgres puro
- OAuth Google/Meta/Pipefy: refresh tokens continuam válidos, só atualizar callback URLs nos consoles
- Reset de senha / signup precisa nova implementação (não tem mais GoTrue)

### 5. `FRONTEND_ADAPTATIONS.md`
O que a nova app frontend precisa fazer para substituir `@/integrations/supabase/client`:
- Padrão de cliente DB (`pg` pool com `SET LOCAL app.user_id`)
- Equivalente de `supabase.auth.*` (signIn, signUp, signOut, onAuthStateChange)
- Equivalente de `supabase.from('x').select()` (REST próprio ou ORM como Drizzle/Prisma)
- Equivalente de `supabase.functions.invoke()` (chamada HTTP direta às novas functions Node)
- Equivalente de `supabase.rpc()` (chamar funções SQL via `pg`)

### 6. `INFRA_REQUIREMENTS.md`
Pré-requisitos do servidor Postgres puro:
- Postgres 15+ recomendado
- Extensões: `pg_cron` + `pg_net` (se quiserem manter os cron jobs do `06_cron.sql`)
- Alternativa sem `pg_net`: rodar cron jobs como systemd timers / GitHub Actions
- Pool de conexões (PgBouncer recomendado)
- Backups

### 7. `CHECKLIST.md`
Passo-a-passo executável no destino:
```
[ ] 1. Provisionar Postgres + instalar pg_cron/pg_net
[ ] 2. psql -f 01_schema.sql
[ ] 3. psql -f 99_postgres_puro_adaptations.sql
[ ] 4. psql -f 02_functions.sql + 03_triggers.sql
[ ] 5. psql -f 11_data_load.sql
[ ] 6. psql -f 20_auth_users.sql (migrar para novo auth)
[ ] 7. Portar edge functions conforme EDGE_FUNCTIONS_PORTING.md
[ ] 8. Construir novo client frontend conforme FRONTEND_ADAPTATIONS.md
[ ] 9. Configurar secrets do 40_secrets.env.example
[ ] 10. Atualizar OAuth callback URLs nos consoles
[ ] 11. Validar com queries de contagem
```

## Entrega

Novo zip `migration-package-docs-postgres-puro-2026-06-02.zip` agregando todos os arquivos antigos + os 7 novos documentos. Entregue via `<presentation-artifact>`.

## Confirmação

Este projeto Lovable **não é tocado**. Só leio coisas e escrevo em `/mnt/documents/`. Posso prosseguir?