
## Problemas detectados

Hoje o `ChurnDossierSection` recebe três insumos vindos de `useOperationsData` (Pipefy bruto) que estão divergindo da Visão Geral CS:

| Métrica | Fonte atual (errada) | Fonte correta |
|---|---|---|
| MRR ativo (base do Revenue Churn) | `opsData.kpis.mrrTotal` (soma Pipefy) | `mrr_base_monthly` (Oxy Finance) — Jun/2026 = **R$ 722.605** |
| Clientes ativos (base Logo Churn Total) | `opsData.kpis.totalAtivos` = **139** | Visão Geral CS / `useJornadaData` = **128** |
| Clientes ativos MRR (base Logo Churn MRR) | `opsData.kpis.activeClientesMrr` = **11** | Visão Geral CS = total MRR (≈ 128 - pontuais) |
| Clientes ativos Pontual | `opsData.kpis.activeClientesPontual` | Visão Geral CS (`c.mrr === 0 && c.pontual > 0`) |

A Visão Geral CS (`src/components/planning/cs/VisaoGeralCS.tsx`) consome `useJornadaData` + `useMrrBase`, que são a fonte de verdade aceita pelo usuário.

## Mudanças

### 1. `src/components/planning/NpsTab.tsx`
- Importar `useJornadaData` e `useMrrBase`.
- Calcular, com a mesma lógica de Visão Geral CS:
  - `activeClientes = jornada.clientes.filter(c => !INACTIVE_PHASES.includes(c.faseAtual))`
  - `activeClientesPontualCount = activeClientes.filter(c => c.mrr === 0 && c.pontual > 0).length`
  - `activeClientesMrrCount = activeClientes.length - activeClientesPontualCount`
  - `mrrBaseAtual` = `getMrrBaseForMonth` do mês de referência (último mês do `globalDateRange.to`; se sem filtro, o mês mais recente disponível em `mrr_base_monthly`).
- Substituir os 4 props passados ao `ChurnDossierSection`:
  - `activeClientesCount = activeClientes.length`
  - `activeClientesMrrCount` e `activeClientesPontualCount` (acima)
  - `activeMrr = mrrBaseAtual`

### 2. `src/components/planning/nps/ChurnDossierSection.tsx`
- Nenhuma mudança de fórmula: continuar com
  - `revenueChurnPct = totalMrrPerdido / (activeMrr + totalMrrPerdido) × 100`
  - `logoChurnPct = filtered.length / (activeClientesCount + filtered.length) × 100`
  - `logoChurnMrrPct` / `logoChurnPontualPct` idem.
- O efeito da mudança vem só da troca da fonte dos números.
- Atualizar o `formula` dos drawers `openMrrAtivo` e `openRevenueChurnPct` para refletir que `MRR` agora é o **MRR Base (Oxy Finance)** do mês de referência, não a soma Pipefy.
- O drawer "MRR Ativo — clientes que compõem" deixa de mostrar a lista de clientes (não há mais correspondência 1:1 com a soma). Substituir por um card simples com o valor e a referência da fonte (`Oxy Finance · mrr_base_monthly`).

### 3. Sem mudanças em
- `useOperationsData.ts` (continua alimentando OperationsSection / "Visão Geral" antiga).
- Lógica de churn (filtro, overrides, dedup) permanece intocada.

## Resultado esperado (Jun/2026, sem filtros)
- MRR card "Estado atual" → R$ 722.605
- Revenue Churn (%) calculado sobre R$ 722.605 + perdido
- Logo Churn Total → 128 + N churns na base
- Logo Churn MRR → base correta de clientes MRR (mesma da Visão Geral)
