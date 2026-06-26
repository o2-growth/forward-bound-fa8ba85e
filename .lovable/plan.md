## Causa raiz dos 166 churns

Na aba **Visão CEO**, o card "Churn (logos)" e o gráfico "Churn por squad" usam `operacao.churnQtd` vindo de `useOperationsData → kpis.churn`, calculado como:

```
churn = phaseCount['Churn'] + phaseCount['Atividades finalizadas'] + phaseCount['Desistência']
```

Isso conta **todos os cards em fases terminais desde o início da operação** — não respeita o `dateRange` da Visão CEO. Por isso aparece 166 (acumulado histórico) em vez do número do período selecionado.

O `churnDossier` já tem `dataEncerramento` por card e já é filtrado por `CHURN_CUTOFF` (Out/2025) — basta reaproveitar com o período do CEO.

## Mudança

Em `src/components/planning/CeoViewTab.tsx`, no `useMemo` `operacao` (linha 254):

1. Filtrar `dossier` pelo `dateRange.from / dateRange.to` usando `c.dataEncerramento` (fallback: ignora cards sem data, igual ao restante do dossiê).
2. Recalcular a partir do dossier filtrado:
   - `churnQtd` = `dossierFiltrado.length` (substitui `kpis.churn`)
   - `churnBySquad` agrupado a partir do dossier filtrado (já é hoje, só passa a usar a versão filtrada)
   - `churnMrrTotal` idem
   - `retencaoRate` recalculado: `100 - (churnQtd / (clientesAtivos + churnQtd) * 100)` — mantém coerência com o KPI exibido logo ao lado
3. Manter `clientesAtivos`, `mrrBase`, `tratativas`, `mrrEmRisco` como estão (são snapshots do estado atual, não do período).
4. Adicionar dependência `dateRange.from` e `dateRange.to` ao `useMemo`.

## Validação

- Selecionar Jun/26 → "Churn (logos)" deve bater com a contagem de churns do mês na aba Operação/NPS (que já usa o dossier filtrado).
- Selecionar "todo o período" desde Out/25 → bate com o total do dossiê (~166 se for o caso real).
- Gráfico "Churn por squad" passa a respeitar o período (Eduardo: 6 em Mar/26, não acumulado).

## Escopo

Somente `src/components/planning/CeoViewTab.tsx`. Nenhuma mudança em hooks ou em outras abas — a fonte de dados (`useOperationsData`) continua igual; só a Visão CEO passa a filtrar o dossier pelo período antes de exibir.
