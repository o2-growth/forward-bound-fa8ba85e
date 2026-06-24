# Classificar cards do Funil de Monetização como "Quente"

## Objetivo
Cards do pipe **Monetização** cujo tipo seja **Upsell**, **Cross-sell** (Novo produto) ou **Troca de produto** devem entrar automaticamente no bucket **🔥 Quente** do "Termômetro dos Leads", independente de terem ou não Label/Prioridade no Pipefy. Downsell continua de fora.

## Arquivos

### 1. `src/components/planning/indicators/temperaturaAggregator.ts`
- Adicionar `monetizacaoAnalytics: ReturnType<typeof useMonetizacaoAnalytics>` (opcional) em `AggregateInput`.
- Após percorrer as fontes por BU, percorrer `monetizacaoAnalytics.cards` filtrando `tipo ∈ {"Upsell","Cross-sell","Troca de produto"}` e com `entrada` dentro de `[startDate, endDate]`.
- Para cada um, gerar `DetailItem` via `monetizacaoAnalytics.toDetailItem(card)`, anotar `bu: "Monetização"` e empurrar em `buckets.Quente`.
- Dedup por `id` dentro do bucket Quente (caso o mesmo card já tenha vindo de uma BU com tag Quente, manter um só).
- Incluir `"Monetização"` em `activeLabels` quando houver pelo menos 1 card elegível.

### 2. `src/components/planning/IndicatorsTab.tsx`
- Já existe `useMonetizacaoAnalytics(startDate, endDate)` em uso para `MonetizacaoSection`. Reaproveitar a mesma instância e passar como prop `monetizacaoAnalytics` para `<TemperaturaSection ... />` e `<CenarioCaixaSection ... />`.

### 3. `src/components/planning/indicators/TemperaturaSection.tsx`
- Atualizar o texto do header para deixar claro: "Inclui Upsell, Cross-sell e Troca de produto do funil de Monetização (considerados Quentes)".
- Nenhuma mudança de UI além disso — o bucket já é clicável e o `DetailSheet` já mostra a coluna `bu`.

### 4. `src/components/planning/indicators/CenarioCaixaSection.tsx`
- Sem mudança de comportamento além de receber a mesma prop e repassar para `aggregateByTemperatura`, para que o cenário de caixa também considere esses cards no bucket Quente (mantém coerência entre as duas seções).

## Validação
- Período corrente: abrir aba Indicadores → conferir que o chip 🔥 Quente cresce conforme cards de Upsell/Cross/Troca existentes no funil de Monetização.
- Clicar no chip Quente → ver linhas com coluna BU = "Monetização" e fase = "Fase Atual" do pipe.
- Downsell **não** deve aparecer.
- Cards sem tag de BU continuam contando em `totalSemTag` normalmente; cards de Monetização **não** afetam `totalSemTag` (são sempre classificados).
