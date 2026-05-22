## Problema

Na aba **CFOs > Comparativo P&L por CFO**, a linha **Churns** está zerada para todos os CFOs quando o filtro de data está em meses recentes (ex.: 01/04/2026 – 30/04/2026), mesmo havendo churns reais no período.

Causa raiz: o `CfoView` filtra churns pelo campo `dataEntrada` (data em que o card entrou na fase atual no Pipefy). Esse valor pode ser bem diferente da data oficial do churn — e em muitos casos os clientes considerados churn pelo dossiê **não têm `dataEntrada` no período filtrado**, então caem fora da contagem.

A regra oficial (já aplicada no `ChurnDossierSection` e no `useOperationsData`) é usar:
1. `Data encerramento` / `Data de encerramento` do card Central de Projetos, **ou**
2. `Data do churn` (campo manual), como fallback.

Sem uma dessas datas, o cliente não conta como churn do período.

## Mudanças

### 1. `src/components/planning/jornada/types.ts`
- Adicionar `dataChurnOficial: Date | null` em `JornadaCliente`.

### 2. `src/hooks/useJornadaData.ts`
- Já existe `churnDateByTitulo` (linhas 256-264) que lê `Data encerramento` da Central de Projetos.
- Estender para também considerar `Data do churn` como fallback (alinhado ao `useOperationsData`).
- Ao montar cada `JornadaCliente` (linhas 474-489), preencher `dataChurnOficial = churnDateByTitulo.get(titulo.toLowerCase()) ?? null`.

### 3. `src/components/planning/jornada/CfoView.tsx`
- Em `clientesPeriodo` (linhas 683-697): para clientes em `CHURN_PHASES`, filtrar por `c.dataChurnOficial` (em vez de `c.dataEntrada`). Cliente em fase de churn **sem** `dataChurnOficial` é **excluído** do período (mesma regra do dossiê).
- Em `churnsPerCfo` (linhas 783-791): contar apenas clientes com `dataChurnOficial` dentro do `dateRange` quando filtro ativo; sem filtro, contar todos em CHURN_PHASES com data oficial presente.
- Manter a lógica de "clientes ativos" intacta (continua usando `dataAssinatura`).

## Fora de escopo

- Não alterar a tabela do dossiê de churn nem os KPIs da aba Churn.
- Não mexer em outras views (Visão Geral, Clientes, Reuniões, NPS, Alertas).
- Não alterar gráficos da aba CFOs além da linha **Churns** da tabela comparativa.

## Validação

Após aplicar, com filtro 01/04/2026–30/04/2026, a linha Churns deve refletir os mesmos churns que aparecem no dossiê de Churn para abril/2026, distribuídos por CFO.
