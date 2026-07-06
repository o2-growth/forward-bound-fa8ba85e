# Alinhar Fat Incremento (acelerômetro) com o Pace de Faturamento

## Diagnóstico

Print (Consolidado, 01–06/07/2026):
- Pace "Faturamento" (Pipefy Vendas, acumulado): **R$ 53k** realizado
- Acelerômetro "Fat Incremento": **R$ 41k** realizado
- Meta idêntica (R$ 216k) → problema é só no **realizado**.

Fontes:
- **Pace** (`IndicatorsTab.tsx` linhas 3525, 3562–3573): `getItemsForIndicator('venda')` — usa `modeloAtualAnalytics.getDetailItemsForIndicator('venda')`, que já está mesclado com Outbound.
- **Acelerômetro Fat Incremento** (`getRealizedMonetaryForIndicator`, linhas 2623–2664): para Modelo Atual **sem filtro**, cai em `getModeloAtualValue('venda', startDate, endDate)` — hook `useModeloAtualMetas`, **que não inclui Outbound**. Idem para os outros gauges monetários (MRR, Setup, Pontual) nas linhas 2688–2762.

Δ ≈ R$ 12k = exatamente o valor de cards Outbound de venda no período que estão sendo ignorados pelo gauge.

Já corrigimos o mesmo tipo de bug no Funil do Período trocando a fonte de MA para a versão mesclada com Outbound. Agora falta corrigir os gauges monetários.

## Plano

Em `src/components/planning/IndicatorsTab.tsx`, em `getRealizedMonetaryForIndicator`:

1. **`faturamento` (linhas 2626–2633)**: no branch sem filtro (Modelo Atual), trocar
   `total += getModeloAtualValue('venda', startDate, endDate)`
   por
   `total += modeloAtualAnalytics.getCardsForIndicator('venda').reduce((s, c) => s + (c.valor || 0), 0)`
   (mesma soma feita quando filtro está ativo, já inclui Outbound).

2. **`mrr` (linhas 2690–2696)**: trocar `getMrrForPeriod(...)` por
   `modeloAtualAnalytics.getCardsForIndicator('venda').reduce((s, c) => s + (c.valorMRR || 0), 0)`.

3. **`setup` (linhas 2710–2716)**: trocar `getSetupForPeriod(...)` por
   `modeloAtualAnalytics.getCardsForIndicator('venda').reduce((s, c) => s + (c.valorSetup || 0), 0)`.

4. **`pontual` (mesma seção, ~linhas 2730-2760)**: trocar `getPontualForPeriod(...)` por
   `modeloAtualAnalytics.getCardsForIndicator('venda').reduce((s, c) => s + (c.valorPontual || 0), 0)`.

5. **Validação (Playwright)**: filtro Consolidado + 01–06/07/2026, comparar acelerômetros (Fat Incremento, MRR, Setup, Pontual) com o topo do Pace de Faturamento. Confirmar que todos batem, e que continua consistente com filtro por Closer/BU ativo.

Sem mudança de dados nem de metas. Só alinhar a fonte de "realizado" de Modelo Atual dos gauges monetários com a mesma fonte já usada pelo Pace e pelo Funil do Período (analytics mesclada com Outbound).
