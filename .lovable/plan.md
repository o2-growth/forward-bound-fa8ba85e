
## Contexto

A nova aplicação será **totalmente separada** deste projeto Lovable e rodará contra o **Postgres do servidor de vocês**. Este projeto Lovable **continua 100% intacto e em produção** — o que fazemos aqui é gerar um **pacote de migração** (cópias de schema, dados, código) pronto para ser importado no novo ambiente.

## Garantia: zero impacto neste projeto

Tudo é **somente leitura**. Nada é alterado aqui:

- ❌ **Não** executamos `ALTER`, `DROP`, `DELETE`, `UPDATE`, `INSERT`, `CREATE` no banco.
- ❌ **Não** rodamos migrations.
- ❌ **Não** modificamos nenhum arquivo de `src/`, `supabase/functions/`, `supabase/config.toml`.
- ❌ **Não** mexemos em secrets, RLS, auth ou edge functions deployadas.
- ❌ **Não** desabilitamos Lovable Cloud.
- ✅ Apenas `SELECT` no banco (via `supabase--read_query`) e leitura de arquivos do repo para **copiar** para `/mnt/documents/migration/`.

Se a qualquer momento for necessário escrever algo neste projeto, **paro e pergunto antes**.

## Entregáveis (em `/mnt/documents/migration/`, fora do projeto)

```text
migration/
├── 01_schema.sql              # CREATE TABLE, enums, índices, FKs (gerado via SELECT no information_schema)
├── 02_functions.sql           # Funções SQL existentes (has_role, handle_new_user, audit, etc.)
├── 03_triggers.sql            # Triggers existentes
├── 04_rls_policies.sql        # Políticas RLS (referência — opcional importar)
├── 05_grants.sql              # GRANTs por role
├── 10_data/                   # 1 CSV por tabela (via SELECT + write-to-CSV)
│   ├── profiles.csv
│   ├── monetary_metas.csv
│   └── ...
├── 11_data_load.sql           # \copy comandos para importar os CSVs no novo Postgres
├── 20_auth_users.csv          # id, email, encrypted_password, metadata (SELECT em auth.users)
├── 30_edge_functions/         # Cópia read-only de supabase/functions/* + README de portabilidade
├── 40_secrets.env.example     # Lista de nomes de secrets (sem valores)
└── README.md                  # Passo-a-passo de import no servidor de vocês
```

Entrego ao final como `.zip` baixável via `<presentation-artifact>`.

## Etapas (todas read-only neste projeto)

### 1. Schema
- Consulto `information_schema` + `pg_catalog` via `supabase--read_query` para reconstruir DDL atualizado de todas as tabelas, enums, FKs, índices e defaults do schema `public`.
- Gravo em `01_schema.sql`.

### 2. Funções, triggers, grants, RLS
- Consulto `pg_proc`, `pg_trigger`, `pg_policies`, `information_schema.role_table_grants`.
- Gravo em `02_functions.sql`, `03_triggers.sql`, `04_rls_policies.sql`, `05_grants.sql`.

### 3. Dados
- Para cada tabela do `public` (exceto `meta_ads_cache` e tabelas `*_backup_*`, que ficam opcionais), `SELECT *` paginado via `supabase--read_query` e gravo CSV em `10_data/`.
- Ordem de import em `11_data_load.sql` respeita dependências (profiles → user_roles → demais).

### 4. Usuários (auth.users)
- `SELECT id, email, encrypted_password, raw_user_meta_data, created_at, email_confirmed_at FROM auth.users` → `20_auth_users.csv`.
- README explica como importar tanto em Supabase self-hosted quanto em outro stack de auth (hashes bcrypt são portáveis).

### 5. Edge Functions
- **Cópia** read-only de `supabase/functions/*` para `30_edge_functions/` (zero alteração no original).
- README de portabilidade: como rodar em Node/Deno fora do Supabase, o que substituir (`has_role`, RLS, JWT do Supabase, etc.).

### 6. Secrets
- Listo nomes (já visíveis via `fetch_secrets`) em `40_secrets.env.example`, **sem valores**. Vocês copiam os valores do dashboard manualmente.

### 7. README final
Passo-a-passo no servidor de destino:
```text
1. psql -h <host> -f 01_schema.sql
2. psql -h <host> -f 02_functions.sql
3. psql -h <host> -f 03_triggers.sql
4. psql -h <host> -f 05_grants.sql
5. cd 10_data && psql -h <host> -f ../11_data_load.sql
6. (opcional) importar 20_auth_users.csv
7. configurar secrets a partir de 40_secrets.env.example
8. portar edge functions de 30_edge_functions/ para o runtime escolhido
```

## Notas importantes

- **UUIDs preservados**: FKs entre tabelas continuam válidas após import.
- **Tabelas `*_backup_*`**: ficam de fora por padrão (são snapshots históricos). README marca como opcional.
- **OAuth Google Ads / Meta Ads**: tokens não são exportáveis — vocês criarão novas credenciais nas consoles e refazem o consent na nova app.
- **Storage**: não há buckets ativos.
- **Cron jobs**: verifico `cron.job`; se existirem, gero `06_cron.sql` separado.

## O que **não** está incluído

- Frontend (`src/`): nova app é diferente, vocês não querem.
- Tokens vivos / refresh tokens OAuth.

## Próxima ação

Em build mode, gero os arquivos sob `/mnt/documents/migration/` e entrego como `.zip`. Nenhum arquivo do projeto é alterado.
