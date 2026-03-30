# Database Backup - Planning 2026

**Data de Exportação:** 2026-03-16
**Projeto:** O2 Inc - Planning 2026

## Estrutura do Backup

```
database-backup/
├── csv/
│   ├── profiles.csv              # Perfis de usuários (11)
│   ├── user_roles.csv            # Roles admin/user (11)
│   ├── user_tab_permissions.csv  # Permissões de abas (56)
│   └── sales_realized.csv       # Vendas realizadas (12)
├── full-backup.sql               # Script SQL completo (schema + dados + RLS)
├── seed.sql                      # Script legado (dados antigos @oxycapital)
└── README.md                     # Este arquivo
```

## Resumo dos Dados

| Tabela | Registros | Incluído no SQL | Descrição |
|--------|-----------|-----------------|-----------|
| profiles | 11 | ✅ | Perfis de usuários |
| user_roles | 11 | ✅ | Roles (10 admin, 1 user) |
| user_tab_permissions | 56 | ✅ | Permissões de abas por usuário |
| monetary_metas | 48 | ✅ | Metas monetárias por BU/mês |
| closer_metas | 84 | ✅ | Metas de closers por BU/mês |
| sales_realized | 12 | ✅ | Vendas realizadas por BU/mês |
| mrr_base_monthly | 15 | ✅ | MRR base mensal (2025 + 2026) |
| daily_revenue | 72 | ✅ | Receita diária (Jan-Mar 2026) |
| funnel_realized | 666 | ❌ Re-sync | Dados do Pipefy (re-sincronizável) |
| cost_stage_metas | 0 | ✅ | Vazio |
| admin_audit_logs | 28 | ❌ Histórico | Logs de auditoria |
| meta_ads_cache | ~78 | ❌ Cache | Cache temporário Meta Ads |

## Usuários

| Email | Nome | Role |
|-------|------|------|
| daniel.trindade@o2inc.com.br | Daniel Trindade | admin |
| pedro.albite@o2inc.com.br | Pedro Albite | admin |
| lucas.ilha@o2inc.com.br | Lucas Ilha | admin |
| andreylopes.ia@gmail.com | Andrey Lopes | admin |
| rafael.fleck@o2inc.com.br | Rafael Fleck | admin |
| jv241004@gmail.com | João Victor | admin |
| eduarda.rovani@o2inc.com.br | Eduarda Rovani | admin |
| carlos.ramos@o2inc.com.br | Carlos Ramos | admin |
| amanda.serafim@o2inc.com.br | Amanda Serafim | admin |
| carolina.boeira@o2inc.com.br | Carolina Boeira | admin |
| marco.azevedo@o2inc.com.br | Marco Aurélio Azevedo | user |

## Business Units (BUs)

- `modelo_atual` - Modelo Atual (O2 principal)
- `o2_tax` - O2 Tax
- `oxy_hacker` - Oxy Hacker
- `franquia` - Franquia

## Closers

- **Daniel Trindade** - Modelo Atual (65-100%), Franquia (0%), Oxy Hacker (0%)
- **Pedro Albite** - Modelo Atual (0-35%), Franquia (100%), Oxy Hacker (100%)
- **Lucas Ilha** - O2 Tax (100%)

## Tab Keys (Permissões)

- `context` - Contexto 2025
- `goals` - Metas 2026
- `sales` - Metas de Vendas
- `monthly` - Receita Mensal
- `media` - Investimento em Mídia
- `marketing` - Plano de Marketing
- `structure` - Estrutura
- `indicators` - Indicadores
- `marketing_indicators` - Indicadores de Marketing
- `admin` - Administração

## Como Usar o full-backup.sql

### Pré-requisitos
1. Criar um novo projeto Lovable Cloud / Supabase
2. **PRIMEIRO**: Criar os usuários no Auth com os mesmos emails
3. Os UUIDs gerados pelo Auth serão diferentes — atualizar no SQL antes de executar

### Execução
1. Crie os usuários no Auth (emails acima)
2. Anote os novos UUIDs
3. Substitua os UUIDs antigos no `full-backup.sql`
4. Execute o SQL no editor

### Conteúdo do full-backup.sql
- ✅ Schema completo (CREATE TABLE com tipos e defaults)
- ✅ Enum `app_role` (admin, user)
- ✅ Funções: `has_role`, `handle_new_user`, `update_sales_realized_updated_at`
- ✅ Trigger `handle_new_user` (instrução para criar manualmente)
- ✅ Todas as políticas RLS
- ✅ Dados de 8 tabelas com ON CONFLICT
- ❌ funnel_realized (re-sincronizar via Edge Function)
- ❌ admin_audit_logs (histórico, não necessário)
- ❌ meta_ads_cache (cache temporário)

### Dados re-sincronizáveis
Após importar o backup, execute as Edge Functions:
- `sync-pipefy-funnel` → popula `funnel_realized`
- `sync-daily-revenue` → popula `daily_revenue` (já incluído no SQL)

## Edge Functions Secrets

Configurar no novo projeto:

| Secret | Descrição |
|--------|-----------|
| GOOGLE_ADS_DEVELOPER_TOKEN | Token do Google Ads |
| GOOGLE_ADS_CLIENT_ID | Client ID OAuth Google |
| GOOGLE_ADS_CLIENT_SECRET | Client Secret OAuth Google |
| GOOGLE_ADS_REFRESH_TOKEN | Refresh Token Google |
| GOOGLE_ADS_CUSTOMER_ID | Customer ID Google Ads |
| META_AD_ACCOUNT_ID | ID da conta Meta Ads |
| META_ACCESS_TOKEN | Token de acesso Meta |
| EXTERNAL_PG_HOST | Host do PostgreSQL externo (Pipefy) |
| EXTERNAL_PG_PORT | Porta do PostgreSQL externo |
| EXTERNAL_PG_DATABASE | Nome do banco externo |
| EXTERNAL_PG_USER | Usuário do banco externo |
| EXTERNAL_PG_PASSWORD | Senha do banco externo |
| EXTERNAL_SUPABASE_URL | URL do Supabase externo |
| EXTERNAL_SUPABASE_KEY | Key do Supabase externo |
| PIPEFY_API_KEY | API Key do Pipefy |
| OXY_FINANCE_API_KEY | API Key Oxy Finance |
| GOOGLE_SHEET_ID | ID da planilha Google |
| LOVABLE_API_KEY | API Key Lovable AI |

## Notas Importantes

⚠️ **Senhas**: NÃO incluídas. Usuários precisam redefinir senhas.

⚠️ **UUIDs**: Específicos deste projeto. Atualizar após recriar usuários.

⚠️ **seed.sql (legado)**: Contém dados antigos com emails @oxycapital.com que NÃO existem mais. Use `full-backup.sql` em vez disso.

⚠️ **funnel_realized**: 666 registros omitidos do SQL por volume. Re-sincronizar via `sync-pipefy-funnel`.
