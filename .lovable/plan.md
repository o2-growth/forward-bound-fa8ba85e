## Mudanças no Customer Success / Dossiê de Churn

### 1. Gráfico "MRR Perdido por CFO" — adicionar quantidade de clientes
Arquivo: `src/components/planning/nps/ChurnDossierSection.tsx`

- Renomear título para **"Churn por CFO — MRR e Clientes"**.
- O `cfoChartData` já contém `churns` e `mrr`. Manter a barra horizontal de MRR e:
  - Exibir um label à direita de cada barra mostrando `Nº clientes` (ex.: `12 cl. · R$ 45k`), OU
  - Adicionar uma segunda barra fina (combo) com `churns` em outro eixo X.
- Implementação preferida: usar `<LabelList>` do recharts na barra MRR no formato `"{churns} cl. · {mrrCompact}"` para manter o card compacto sem segundo eixo.

### 2. Novo KPI "Taxa de Salvamento" (tratativas resolvidas vs churns)
Arquivo: `src/components/planning/nps/ChurnDossierSection.tsx` + `CustomerSuccessTab.tsx`

- Adicionar nova prop opcional `tratativasResolvidasCount?: number` em `Props`.
- `CustomerSuccessTab.tsx` (linha ~459) passar `tratativasResolvidasCount={operacao.tratativasResolvidasCount}`.
- Na linha "Churn no período" (grid de KPIs), expandir de 4 para 5 cards (`md:grid-cols-5`) adicionando:
  - **Tratativas Resolvidas (Salvas)** — valor `tratativasResolvidasCount`, com sublabel "salvas no período".
  - **Taxa de Salvamento** — `resolvidas / (resolvidas + churns) × 100`, com tooltip explicando a fórmula. Cor verde se ≥ 50%, amarelo entre 30-50%, vermelho < 30%.
- Como serão 6 cards na linha 2, usar `md:grid-cols-3 lg:grid-cols-6` para acomodar bem em 1008px.

### 3. Alinhar MRR da "Visão Geral CS" com o do Dossiê
Arquivo: `src/components/planning/CustomerSuccessTab.tsx` + `src/components/planning/cs/VisaoGeralCS.tsx`

- Hoje `VisaoGeralCS` recebe `mrrBase={mrrBase}` (vem do hook). O Dossiê usa `activeMrr={847892}` (hardcoded em CustomerSuccessTab linha 464).
- Trocar a prop passada: `mrrBase={847892}` no `<VisaoGeralCS>` (mesmo valor literal usado no Dossiê), para garantir consistência exibida.
- Atualizar tooltip do card "MRR Base" em `VisaoGeralCS.tsx` (linha 195) para refletir que é "soma de Valor CFOaaS + Valor OXY dos clientes ativos" — texto já descreve isso corretamente; nenhuma outra mudança no componente.

Observação: o ideal arquitetural seria centralizar `activeMrr` num hook único, mas como o valor já é compartilhado via prop hardcoded no parent, basta reutilizá-lo. Se preferir, podemos extrair para uma constante `ACTIVE_MRR_SNAPSHOT` no topo de `CustomerSuccessTab.tsx` para usar nos dois lugares — me avise se quiser.

### Arquivos editados
- `src/components/planning/nps/ChurnDossierSection.tsx` — gráfico CFO + 2 novos KPIs + nova prop
- `src/components/planning/CustomerSuccessTab.tsx` — passar `tratativasResolvidasCount` e alinhar `mrrBase`

Sem alterações em hooks, edge functions ou banco.