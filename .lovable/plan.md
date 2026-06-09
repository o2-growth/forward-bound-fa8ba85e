# Operação: separar clientes ativos por tipo + Logo Churn segmentado

## Objetivo

1. Na aba Operação / Dossiê de Churn, separar **Clientes Ativos** em dois grupos:
   - **Clientes MRR** (recorrentes: CFOaaS + OXY, etc.)
   - **Clientes Pontual** (somente produtos pontuais: Diagnóstico, Turnaround, Valuation, Educação)
2. Adicionar **Logo Churn comparativo por tipo**:
   - Logo Churn Total (já existe — base = todos clientes)
   - Logo Churn **MRR** = churns de clientes MRR / (ativos MRR + churns MRR)
   - Logo Churn **Pontual** = churns de clientes Pontual / (ativos Pontual + churns Pontual)

A regra de classificação MRR vs Pontual já existe no hook (`PONTUAL_ONLY_PRODUCTS` em `useOperationsData.ts:271`): se TODOS os produtos do cliente pertencem à lista pontual → cliente Pontual; caso contrário → cliente MRR.

## Mudanças

### 1. `src/hooks/useOperationsData.ts` — expor contagens segmentadas

Em `processProjects()` (linha ~262):
- Contar separadamente `activeClientesMrr` e `activeClientesPontual` durante o loop atual de `currentPhase`.
- `pontualTotalAtivo` (soma de `clientPontual` dos ativos) — já temos por cliente, falta agregar.
- Retornar esses novos campos junto com `mrrTotal`, `emOnboarding`, etc.

No retorno do hook (linha ~778), propagar `activeClientesMrr`, `activeClientesPontual`, `pontualTotalAtivo`.

### 2. Classificar cada churn em MRR vs Pontual

No `churnDossier` (mesma função, linha ~373), adicionar campo `tipoCliente: 'mrr' | 'pontual'` em cada `ChurnDossierCard` usando a mesma regra `PONTUAL_ONLY_PRODUCTS` aplicada ao campo `produto` do card.

Adicionar `tipoCliente` à interface `ChurnDossierCard` (linha ~171).

### 3. `src/components/planning/nps/ChurnDossierSection.tsx` — novos KPIs

- Receber `activeClientesMrrCount` e `activeClientesPontualCount` via props.
- Em `filtered`, separar `filteredMrr = filtered.filter(d => d.tipoCliente === 'mrr')` e `filteredPontual = filtered.filter(d => d.tipoCliente === 'pontual')`.
- Calcular `logoChurnMrrPct` e `logoChurnPontualPct`.
- **Linha "Estado atual"** (hoje 3 cards: MRR · Clientes Ativos · LT Médio): trocar o card único "Clientes Ativos" por **2 cards lado a lado**: "Clientes MRR" e "Clientes Pontual" (mantendo a linha com 4 cards no md+).
- **Linha "Churn no período"** (hoje 5 cards): adicionar 2 cards extras → "Logo Churn MRR (%)" e "Logo Churn Pontual (%)". Layout passa a `lg:grid-cols-7` (ou agrupar em duas linhas se ficar apertado — preferência: nova sub-linha "Logo Churn segmentado" com 3 cards: Total / MRR / Pontual).
- Cada novo card abre drawer só com clientes do tipo correspondente (reuso de `openLogoChurnPct` parametrizado por tipo).

### 4. `src/components/planning/nps/OperationsSection.tsx` — KPI strip

No strip principal (linha ~191), substituir o card único "Clientes Ativos" por dois: "Clientes MRR" e "Clientes Pontual" (com totais vindos do hook).

### 5. `src/components/planning/NpsTab.tsx` — passar novas props

Propagar `activeClientesMrrCount` e `activeClientesPontualCount` para `<ChurnDossierSection>`.

## O que NÃO muda

- Cálculo de MRR financeiro (já exclui Pontual corretamente).
- Revenue Churn (R$ / %) — continua usando MRR perdido como hoje.
- Filtros existentes (CFO, Motivo, Período, Produto).
- Lista de overrides do dossiê.

## Pontos de decisão

**Layout dos 3 logos churn (Total / MRR / Pontual)**: minha sugestão é criar uma **terceira linha dedicada** "Logo Churn por tipo de cliente" com os 3 cards lado a lado, mantendo a linha "Churn no período" enxuta (5 cards atuais). Confirmo isso na implementação, mas se preferir tudo numa linha só (7 cards), me avisa.
