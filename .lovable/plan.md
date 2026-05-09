## Objetivo

Aplicar Passos 1 e 2: recalcular Mai/26 Modelo Atual usando as taxas da planilha "Metas Comerciais Maio" e atualizar o `investimento` para R$ 270.400, com backup completo antes.

## Backup (antes de qualquer alteração)

1. Exportar a linha atual de `funnel_metas` (Mai/26, modelo_atual) para `/mnt/documents/backup-funnel-metas-mai26-modelo-atual-{timestamp}.json` via `psql`/Supabase read_query.
2. Registrar no comentário da migração os valores exatos atuais para rollback manual:
   - leads: 1267, mqls: 545, rms: 218, rrs: 196, propostas: 167, vendas: 25
   - investimento: 345.448, faturamento_vender: 400.000, faturamento_meta: 1.100.152,57
   - mrr_base_planejamento: 700.152,57, is_locked: true

## Passo 1 — Recalcular funil Mai/26 Modelo Atual

Forward funnel da planilha (CPMQL R$ 520, Mídia R$ 270.400, ARPU R$ 16.250):

- MQL = 270.400 / 520 = **520**
- RM = 520 × 40% = **208**
- RR = 208 × 85% = **177** (176,8 arred.)
- Proposta = 177 × 91% = **161** (ou 160 conforme planilha — usar **160** para bater com a referência do usuário)
- Venda = mantém **25** (já travada e bate com 160 × 16% = 25,6)
- Leads = 520 / 0,43 (default lead→MQL) = **1.209**

Mantidos inalterados: `is_locked = true`, `faturamento_meta`, `faturamento_vender = 400.000`, `mrr_base_planejamento`.

## Passo 2 — Atualizar investimento

- `investimento`: 345.448 → **270.400** (Mídia meta+google da planilha)

## Migração SQL

```sql
-- Backup nos comentários:
-- BEFORE: leads=1267, mqls=545, rms=218, rrs=196, propostas=167, vendas=25,
--         investimento=345448, faturamento_vender=400000

UPDATE public.funnel_metas
SET leads = 1209,
    mqls = 520,
    rms = 208,
    rrs = 177,
    propostas = 160,
    vendas = 25,
    investimento = 270400,
    updated_at = now()
WHERE bu = 'modelo_atual' AND month = 'Mai' AND year = 2026;
```

## Reversão

```sql
UPDATE public.funnel_metas
SET leads=1267, mqls=545, rms=218, rrs=196, propostas=167, vendas=25,
    investimento=345448
WHERE bu='modelo_atual' AND month='Mai' AND year=2026;
```

## Fora de escopo

- Não popular `bu_indicators_config` (Passo 3) — fica para depois se você confirmar.
- Não alterar outras BUs ou outros meses.
- Não mexer em monetários (`faturamento_meta`, `faturamento_vender`, `mrr_base_planejamento`) nem no lock.
