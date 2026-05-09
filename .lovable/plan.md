## Diagnóstico

O backup, a coluna `investimento_planejado`, as taxas (0,491 / 0,722 / 0,884 / 0,243), os CPVs por mês (Jan 6.389,25; Fev 7.986,58; Mar 7.667,13; Abr 6.921,69) e os investimentos planejados (153.342 / 191.678 / 230.014 / 249.181) estão corretos no banco para `modelo_atual`.

O cálculo `vendas = round(invest / cpv)` retorna 24/24/30/36 — correto.

**Bug:** dentro de `applyInvestmentDriver` em `src/hooks/usePlanGrowthData.ts`, o restante do funil usa `Math.ceil`, o que arredonda para cima e produz valores 1–5 unidades acima do esperado.

Comparação Janeiro:

```text
Etapa       Esperado   Atual (ceil)   Correto (round)
Propostas   99         99             99
RRs         112        112            112
RMs         155        156            155
MQLs        316        318            316
Leads       735        740            735
```

Mesmo desvio em Fev (idêntico a Jan), Mar (Propostas 124→123) e Abr (Propostas 149→148).

## Mudança

Em `src/hooks/usePlanGrowthData.ts`, função `applyInvestmentDriver`, trocar 5 chamadas de `Math.ceil` por `Math.round` em:

- `propostas = Math.round(vendas / propToVenda)`
- `rrs = Math.round(propostas / rrToProp)`
- `rms = Math.round(rrs / rmToRr)`
- `mqls = Math.round(rms / mqlToRm)`
- `leads = Math.round(mqls / n)`

Manter `vendas = Math.round(investPlan / cpvMes)` como já está.

## Validação esperada

| Mês | Vendas | Propostas | RRs | RMs | MQLs | Leads | Investimento |
|---|---|---|---|---|---|---|---|
| Jan | 24 | 99 | 112 | 155 | 316 | 735 | R$ 153.342 |
| Fev | 24 | 99 | 112 | 155 | 316 | 735 | R$ 191.678 |
| Mar | 30 | 123 | 140 | 194 | 395 | 918 | R$ 230.014 |
| Abr | 36 | 148 | 168 | 233 | 474 | 1.102 | R$ 249.181 |

## Fora do escopo

- Mai–Dez (sem investimento planejado, lógica antiga preservada)
- Outras BUs
- Limpeza/regravação dos snapshots antigos em `funnel_metas` (Jan–Abr estão `is_locked=false`, então o driver vivo já sobrescreve a exibição)
