## Problema

Hoje a coluna **MRR Base** mostra o **MRR realizado do próprio mês** (Oxy):

- Jan/26 = 705.268 (MRR de Jan)
- Fev/26 = 746.847 (MRR de Fev)
- Mar/26 = 733.281 (MRR de Mar)
- Abr/26 = 700.152 (MRR de Abr)

Mas a definição correta é: **MRR Base de um mês = MRR realizado do mês ANTERIOR** (a base com a qual você começa o mês, antes de churn/vendas/retenção).

Ou seja, o que está em `mrr_base_monthly` hoje é, na verdade, o **MRR fechado do mês**, não o MRR Base. A coluna está deslocada em 1 mês.

## Definição correta

| Mês exibido | MRR Base correto = MRR do mês anterior |
|---|---|
| Jan/26 | MRR de **Dez/25** |
| Fev/26 | MRR de **Jan/26** = 705.268 |
| Mar/26 | MRR de **Fev/26** = 746.847 |
| Abr/26 | MRR de **Mar/26** = 733.281 |
| Mai/26 | MRR de **Abr/26** = 700.152 |
| Jun/26+ | projeção (mês anterior com churn + retenção) |

## Solução

### 1. Sincronizar Dez/2025 da Oxy

Hoje o `sync-mrr-base` só sincroniza a partir de Janeiro do ano solicitado. Vou rodar o sync para `year: 2025` (que já está fechado e vai buscar até Dez/25). Isso popula a linha `Dez/2025` em `mrr_base_monthly`.

Resultado esperado: nova linha `mrr_base_monthly` com `month='Dez', year=2025, value=<MRR Dez/25 da Oxy>`.

### 2. Ajustar a leitura do hook (deslocamento de -1 mês)

Em `src/components/planning/MediaInvestmentTab.tsx` (e em `src/hooks/usePlanGrowthData.ts`), trocar a forma de construir o map `mrrBaseRealPorMes`:

**Antes** (errado):
```ts
mrrBaseRealPorMes['Jan'] = mrr_base_monthly[Jan/2026]  // MRR de Jan = errado
```

**Depois** (correto):
```ts
mrrBaseRealPorMes['Jan'] = mrr_base_monthly[Dez/2025]  // MRR de Dez/25 = base de Jan
mrrBaseRealPorMes['Fev'] = mrr_base_monthly[Jan/2026]
mrrBaseRealPorMes['Mar'] = mrr_base_monthly[Fev/2026]
mrrBaseRealPorMes['Abr'] = mrr_base_monthly[Mar/2026]
mrrBaseRealPorMes['Mai'] = mrr_base_monthly[Abr/2026]
```

Implementação: para cada mês `M` do ano de planejamento (2026), buscar `mrr_base_monthly` do mês imediatamente anterior (com rollover de Jan → Dez do ano anterior).

### 3. Manter inalterado

- **Metas/quantidades em meses lockados** (Mar: MQL=395, A Vender=579.329) seguem vindo do snapshot `funnel_metas`.
- **Cadeia projetada Mai+**: `mrrComChurn` continua calculando MRR projetado para Jun/Jul/.../Dez. O override por Oxy só se aplica até o último mês fechado (que vira base do mês seguinte).
- O cálculo de `faturamentoMeta = mrrBase + faturamentoVender` continua coerente, mas agora `mrrBase` é o número correto.

## Detalhes técnicos

**Arquivos a alterar:**
- `src/components/planning/MediaInvestmentTab.tsx` — lógica do `mrrBaseRealPorMes` (linhas ~1043–1052)
- `src/hooks/usePlanGrowthData.ts` — mesma lógica de map (linhas ~285–292)

**Edge function executada (não alterada):**
- `sync-mrr-base` chamada com `{ year: 2025 }` para popular Dez/25.

**Memória a atualizar:**
- `mem://logic/plan-growth/mrr-projection-source-logic` — refletir que MRR Base = MRR do mês anterior (Oxy), com Jan/26 = Dez/25.

## Validação

Após implementar, conferir na tabela:
- Jan/26: MRR Base = valor de Dez/25 (Oxy)
- Fev/26: MRR Base = 705.268
- Mar/26: MRR Base = 746.847
- Abr/26: MRR Base = 733.281
- Mai/26: MRR Base = 700.152
- Jun/26 em diante: cadeia projetada, partindo de 700.152 com churn e retenção
