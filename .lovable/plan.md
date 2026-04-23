

## MRR cheio no dia 1º + Setup/Pontual reais (vendas novas) no dia da assinatura

### Fórmula confirmada

Para cada mês, no gráfico **Faturamento por Período** (Revenue Pace) das BUs DRE (Modelo Atual + O2 TAX):

- **MRR do mês** = `Faturamento Total DRE do mês − Setup do mês (Pipefy) − Pontual do mês (Pipefy)`
- **Mês fechado** (anterior ao corrente): MRR derivado do DRE real.
- **Mês corrente** (abril): MRR = `MRR Base esperado` da tabela `mrr_base_monthly` (não espera o DRE fechar).
- **Mês futuro**: MRR = `MRR Base esperado` (já é o comportamento atual).

### Distribuição diária

- **Dia 1º do mês** → injeta o **MRR do mês inteiro** de uma vez (degrau).
- **Demais dias** → mostra apenas **Setup + Pontual reais** vindos do Pipefy, no dia da **Data de assinatura do contrato** de cada card vendido (Modelo Atual + O2 TAX, fases "Contrato assinado" e "Ganho", excluindo cards de teste).
- **Oxy Hacker / Franquia** → permanecem como hoje (cards Pipefy por data de assinatura, sem mudança).

### Garantias

- Soma mensal: `MRR_dia_1 + Σ(Setup+Pontual_diário do Pipefy) ≈ Faturamento Total do mês`. Pode haver pequena divergência entre Pipefy e DRE (timing de caixa vs assinatura) — o gráfico reflete a **visão de competência por venda**, não o caixa.
- Sem mudança de schema, sem nova chamada de API.
- Drill-downs, gauges, Composição do Faturamento e aba Financeiro **não são afetados** — apenas o gráfico Revenue Pace.

### Implementação técnica

**Arquivo principal:** `src/components/planning/IndicatorsTab.tsx` (helpers `dailyRevenueMap` e `getDailyRevenueForBUs`, ~linhas 440-466).

**Mudanças:**

1. **Novo memo `salesByDayMap`**: agrega vendas reais do Pipefy (Modelo Atual via `useModeloAtualValues` / `pipefy_indicators_modelo_atual` + O2 TAX via `useO2TaxAnalytics`) por chave `YYYY-MM-DD` baseada em **Data de assinatura do contrato**, somando `Valor Setup + Valor Pontual` por card. Reaproveita hooks já carregados na tela.

2. **Novo memo `monthlyDreTotals`**: soma `daily_revenue` (caas+saas+tax) por mês, filtrado pelas BUs DRE selecionadas. Necessário para derivar o MRR de meses fechados.

3. **Novo memo `monthlySetupPontualPipefy`**: soma `salesByDayMap` por mês para obter o total Setup+Pontual do Pipefy do mês.

4. **Novo helper `getMrrForMonth(monthName)`**:
   - Se mês < mês corrente (fechado): `MRR = monthlyDreTotals[mês] − monthlySetupPontualPipefy[mês]` (clamp ≥ 0).
   - Se mês ≥ mês corrente: `MRR = mrrBaseForMonth(mês)` somando as BUs DRE selecionadas (`getMrrBaseForMonth` para Modelo Atual; análogo para O2 TAX se houver MRR base; senão usa só Modelo Atual).

5. **Reescrever `getDailyRevenueForBUs(dateKey)`** para Modelo Atual + O2 TAX:
   - Se `dateKey` é dia **01** do mês: retorna `getMrrForMonth(mês) + salesByDayMap[dateKey]`.
   - Caso contrário: retorna apenas `salesByDayMap[dateKey]`.
   - Se BUs Oxy Hacker/Franquia também estão selecionadas: somar o realizado delas pelo método atual (cards Pipefy por data de assinatura), sem dia-1 jump.

6. **Call sites (linhas 2815 e 2894)** não mudam.

### Edge cases tratados

- Mês sem dados Pipefy ainda → MRR Base aparece sozinho no dia 1º.
- Mês fechado em que Pipefy > DRE → MRR clampa em 0 (não vira negativo).
- BU Oxy Hacker/Franquia isolada → comportamento atual preservado (sem dia 1º jump, pois não usa DRE).
- Período que cruza meses → cada dia 1º contido no range injeta o MRR daquele mês.

### Fora de escopo

- Aba Financeiro / DRE / Composição do Faturamento / Gauges monetários / drill-downs — não mudam.
- Ajuste do `useOxyFinance` — não necessário, o cálculo é feito no consumidor.

