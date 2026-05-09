## Objetivo

Trocar a lógica de cálculo do funil em `MediaInvestmentTab` para **bottom-up**, exatamente como você descreveu:

```text
VENDA     = X (meta do mês)         ← INPUT
PROPOSTA  = VENDA   / prop_to_venda
R.R       = PROPOSTA / rr_to_prop
R.M       = R.R     / rm_to_rr
MQL       = R.M     / mql_to_rm
LEAD      = MQL     / lead_to_mql
MÍDIA     = MQL × CPMQL             ← OUTPUT
```

Cada mês usa **suas próprias taxas e CPMQL** vindos de `bu_indicators_config` (já há linha por BU + mês).

## Mudanças (somente em `src/components/planning/MediaInvestmentTab.tsx`)

### 1. Origem das Vendas (root)
Mantém a lógica atual: `vendas = aVender / ticketMedio` por mês (cadeia MRR já existente em `mrrDynamic.revenueToSell` + `ticket_medio` da config do mês). Para BUs sem cadeia MRR (O2 TAX, Oxy Hacker, Franquia) usa `metaMonetaria / ticketMedio` do próprio mês.

### 2. `calculateReverseFunnel` passa a aceitar métricas **por mês**
Em vez de receber um único `FunnelMetrics`, recebe um `Record<string, FunnelMetrics>` (uma entrada por mês: Jan…Dez). Para cada mês calcula:

```ts
const m = metricsByMonth[month];
const vendas    = aVender / m.ticketMedio;
const propostas = vendas    / m.propToVenda;
const rrs       = propostas / m.rrToProp;
const rms       = rrs       / m.rmToRr;
const mqls      = rms       / m.mqlToRm;
const leads     = mqls      / m.leadToMql;
const investimento = mqls * m.cpmql;   // ← NOVA fórmula (substitui vendas*cpv e vendas*cac)
```

### 3. Remover regras antigas do investimento
- Remove `investimentoCalculado = useCpv ? vendas*cpv : vendas*cac`.
- Remove o "trava de não-decrescente" (`Math.max(investimento, anterior)`) — investimento agora é puro output da cadeia.
- Remove o **deslocamento de 1 mês** (Jan recebia investimento de Fev). Cada mês mostra seu próprio investimento derivado.
- Remove o caso especial `investimentoInicialJan` que recalculava vendas a partir de um investimento fixo.

### 4. Construir `metricsByMonth` por BU
Novo `useMemo` que monta, para cada BU, um mapa `{ Jan: {...}, Fev: {...}, ... }` lendo de `bu_indicators_config` (já buscado pelo hook `useBUIndicatorsConfig`). Se um mês não tiver linha na config, usa fallback: a config do mês mais próximo anterior, ou os defaults atuais. Mantém `leadToMql` fixo por BU como hoje (não está na tabela).

### 5. Meses locked (`is_locked = true` em `funnel_metas`)
Continuam sobrescrevendo o resultado calculado com o snapshot salvo (vendas/propostas/…/investimento), igual hoje. A inversão só afeta meses não-locked.

### 6. Texto/UI
- Atualizar o badge/legenda do card de Investimento para "Investimento = MQL × CPMQL (derivado)".
- Não mexer em CPV/CAC nos cards de configuração — passam a ser ignorados pelo cálculo de investimento, mas seguem visíveis (CPV ainda é usado no histórico/Context2025).

## Não muda
- Schema do banco (todas as colunas necessárias já existem em `bu_indicators_config`).
- Cadeia de MRR/Churn/Retenção que define `aVender`.
- Lock de meses passados / snapshot de `funnel_metas`.
- Outras abas (Macro, NPS, Marketing, etc.).

## Resultado esperado
Quando você muda CPMQL ou qualquer taxa de um mês específico nas Configurações, **só aquele mês** recalcula investimento e quantidades de funil, exatamente como na sua planilha — só que rodando no sentido VENDA → MÍDIA.
