## Estender o zeramento para começar em Março/2026

Atualmente o investimento de Oxy Hacker e O2 TAX foi zerado de **Abr a Dez/2026**. Você quer estender também para **Mar/2026**, que hoje está locked com:

- **Oxy Hacker Mar/2026**: R$ 15.000 (locked)
- **O2 TAX Mar/2026**: R$ 23.321 (locked)

### O que será feito

1. **Snapshot de auditoria** em `bu_investment_snapshots` para Mar/2026 (Oxy Hacker e O2 TAX), preservando os valores atuais antes da alteração com `reason = 'Zeramento estendido para Mar-Dez/2026 (somente investimento)'`.

2. **Atualizar `funnel_metas`** para `oxy_hacker` e `o2_tax`, mês `Mar`, ano 2026:
   - `investimento = 0`
   - `is_locked = false` (destrava para permitir o zeramento)
   - Demais campos (leads, mqls, rms, rrs, propostas, vendas, faturamento_meta, mrr_base_planejamento, faturamento_vender) **permanecem intactos**.

3. **Atualizar memória** `mem://strategy/oxy-tax-zero-investment-abr-2026` → renomear conceitualmente para refletir período Mar–Dez/2026, e atualizar a entrada correspondente no `mem://index.md`.

### Escopo preservado

- Modelo Atual e Franquia: **sem alterações**.
- Outras métricas de Oxy Hacker e O2 TAX em Mar (funil + monetárias): **sem alterações**.
- Apenas o campo `investimento` é zerado.