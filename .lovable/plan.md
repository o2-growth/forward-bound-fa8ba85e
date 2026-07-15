## Objetivo
Corrigir Julho/2026 do Modelo Atual — o problema real é que o mês está **travado** (`is_locked=true`) na tabela `funnel_metas` com um snapshot antigo (61 vendas, 761 MQL, 1.770 leads etc). Enquanto Jul estiver locked, o código não recalcula.

## O que fazer

**Passo 1 — Reverter o override cirúrgico no `MediaInvestmentTab.tsx`** que adicionei no turno anterior (não é mais necessário: a config do DB para Jul já está correta com ticket 18.000, CPMQL 500 e taxas 50/85/75/25).

**Passo 2 — Atualizar o snapshot locked de Jul/modelo_atual em `funnel_metas`** com os valores corretos, mantendo `is_locked=true` (preserva a intenção de "mês travado" mas com números certos):

```sql
UPDATE funnel_metas
SET vendas = 29,
    propostas = 116,
    rrs = 155,
    rms = 183,
    mqls = 366,
    leads = 852,
    investimento = 183000,
    faturamento_vender = 520000,
    faturamento_meta  = 1772039,
    mrr_base_planejamento = 788949,
    updated_at = now()
WHERE bu = 'modelo_atual' AND month = 'Jul' AND year = 2026;
```

Valores derivados de:
- A Vender = R$ 520.000 (input do usuário, mantido)
- Ticket = R$ 18.000 → Vendas = ⌈520.000/18.000⌉ = 29
- Cascata: 29 → 116 → 155 → 183 → 366 → 852 (taxas 25/75/85/50/43%)
- Investimento = 366 × R$ 500 = R$ 183.000

## Escopo — o que NÃO muda
- Nenhum outro mês (Jan–Jun, Ago–Dez) — snapshots deles ficam intactos.
- Nenhuma outra BU (O2 TAX, Oxy Hacker, Franquia).
- `bu_indicators_config` não é tocado (já está correto).
- Lock permanece ativo em Jul (preserva a semântica de mês "fechado").

## Validação
Reabrir Plan Growth › Modelo Atual e conferir a linha de Julho:
- Vendas 29, Propostas 116, RRs 155, RMs 183, MQLs 366, Leads 852, Investimento R$ 183.000
- Ago (e demais meses) inalterados.
