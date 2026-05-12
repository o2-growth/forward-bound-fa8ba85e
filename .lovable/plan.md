## Objetivo

Atualizar configurações de Modelo Atual em **Jan, Fev, Mar/2026** com os novos valores e **recalcular o funil** (MQL → RM → RR → Proposta → Venda) com as novas conversões. **A Vender, MRR Base e metas monetárias ficam intocados.** Antes de qualquer alteração, criar backups completos para rollback.

## Etapa 1 — Backups (migração: cria duas tabelas espelho)

- `bu_indicators_config_backup_20260512_modelo_atual` — snapshot das 3 linhas Jan/Fev/Mar de `modelo_atual`
- `funnel_metas_backup_20260512_modelo_atual_v2` — snapshot das 3 linhas Jan/Fev/Mar de `modelo_atual` em `funnel_metas` (inclui `is_locked`, `faturamento_meta`, `faturamento_vender`, `mrr_base_planejamento`, `investimento`, e quantidades)

Ambas com RLS restrita a admin (SELECT only). Rollback = `UPDATE ... FROM backup`.

## Etapa 2 — Update das configurações (`bu_indicators_config`)

| Campo | Atual (Jan/Fev/Mar) | Novo |
|---|---|---|
| ticket_medio | R$ 22.672,13 | R$ 17.000 |
| cpmql | R$ 461,27 | R$ 473 |
| cpv | 6.389 / 7.986 / 7.667 | R$ 9.052 |
| mql_to_rm | 49,1% | 54% |
| rm_to_rr | 72,2% | 75% |
| rr_to_prop | 88,4% | 88% |
| prop_to_venda | 24,3% | 25% |

`investimento_planejado` preservado em cada mês.

## Etapa 3 — Recálculo do funil (`funnel_metas`)

Como **A Vender é mantido** (Jan 400k, Fev 400k, Mar 500k) e o novo ticket é R$ 17k:

- **Vendas** = `ceil(faturamento_vender / 17000)` → Jan **24**, Fev **24**, Mar **30** (iguais às atuais por coincidência de arredondamento)
- **Propostas** = `ceil(vendas / 0.25)` → Jan/Fev **96**, Mar **120**
- **RR** = `ceil(propostas / 0.88)` → Jan/Fev **110**, Mar **137**
- **RM** = `ceil(rrs / 0.75)` → Jan/Fev **147**, Mar **183**
- **MQL** = `ceil(rms / 0.54)` → Jan/Fev **273**, Mar **339**
- **Leads**: a conversão Lead→MQL não está em `bu_indicators_config`. Hoje a razão real é Jan 735/316 ≈ 43%, Mar 914/393 ≈ 43%. **Proposta**: manter a mesma razão atual de Lead/MQL por mês → Jan/Fev **635**, Mar **789**.

Como as 3 linhas estão `is_locked=true`, o update precisa **respeitar o lock** (SQL direto ignora a checagem do hook React, mas o snapshot anterior fica preservado no backup). Mantemos `is_locked=true` para que dashboards continuem usando a meta congelada — apenas com os novos números.

`faturamento_meta`, `faturamento_vender`, `mrr_base_planejamento`, `investimento` **não mudam**.

## Etapa 4 — Verificação

Após o update, leio as 3 linhas de cada tabela e confirmo no chat os valores aplicados.

## Rollback (se necessário)

```sql
UPDATE bu_indicators_config c
SET cpmql=b.cpmql, cpv=b.cpv, ticket_medio=b.ticket_medio,
    mql_to_rm=b.mql_to_rm, rm_to_rr=b.rm_to_rr,
    rr_to_prop=b.rr_to_prop, prop_to_venda=b.prop_to_venda
FROM bu_indicators_config_backup_20260512_modelo_atual b
WHERE c.bu=b.bu AND c.month=b.month;

UPDATE funnel_metas f
SET leads=b.leads, mqls=b.mqls, rms=b.rms, rrs=b.rrs,
    propostas=b.propostas, vendas=b.vendas
FROM funnel_metas_backup_20260512_modelo_atual_v2 b
WHERE f.bu=b.bu AND f.month=b.month AND f.year=b.year;
```

## Confirmação antes de executar

OK proceder com:
1. Criar as 2 tabelas de backup
2. Atualizar `bu_indicators_config`
3. Recalcular `funnel_metas` com os números acima (Leads usando a razão Lead/MQL atual de cada mês)?