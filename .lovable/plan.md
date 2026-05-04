## Bug

Em `usePlanGrowthData.ts` (~linhas 481-508), quando existe registro em `funnel_metas` para a BU, o merge **sempre** sobrescreve `leads/mqls/rms/rrs/propostas/vendas` com o snapshot — mesmo para meses não-locked. O `if (fixed.is_locked)` só protege os campos monetários (`faturamento_meta`, `faturamento_vender`, `investimento`), criando uma assimetria que faz Maio/2026 mostrar **398 MQLs** (snapshot antigo) em vez dos **558** vindos do reverse funnel ao vivo.

## Correção

Em `src/hooks/usePlanGrowthData.ts`, no `useMemo` `modeloAtualFunnel`, aplicar a mesma regra de lock para quantidades:

- **Mês locked** (`fixed.is_locked === true`): usa o snapshot completo de `funnel_metas` (quantidades + monetários). Comportamento atual preservado para Jan–Abr/26.
- **Mês não-locked** (`fixed.is_locked === false` ou ausente): ignora o snapshot e usa o `calc` (reverse funnel ao vivo). Maio/26 passa a mostrar 558.

## Arquivo afetado

- `src/hooks/usePlanGrowthData.ts` — apenas o bloco de merge dentro do `useMemo modeloAtualFunnel` (~10 linhas). Sem mudança em hooks de banco, edge functions ou outros componentes.

## Garantias de reversibilidade e integridade

- **Nenhum dado é apagado ou alterado** em `funnel_metas`, `monetary_metas`, `mrr_base_monthly`, `bu_indicators_config`.
- O snapshot atual de Maio (`mqls=398`) **continua gravado** em `funnel_metas` — só deixa de ser usado para meses não-locked.
- Meses locked (Jan–Abr/26) ficam idênticos.
- `useConsolidatedMetas`, fluxo de save do Plan Growth, auto-seed de meses futuros e outras BUs não são afetados.
- Para reverter: clicar em revert na mensagem ou usar History — o 398 reaparece imediatamente.

## Resultado esperado

- Maio/2026 Modelo Atual MQLs: **558** (reverse funnel ao vivo).
- Demais quantidades de Maio (`leads`, `rms`, `rrs`, `propostas`, `vendas`) também passam a refletir o cálculo ao vivo.
- Jan–Abr/26 inalterados (locked).
