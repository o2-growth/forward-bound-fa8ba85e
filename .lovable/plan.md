## Problema

Quando você seleciona **Origem = Eventos** (ou qualquer outra origem) no Indicador Comercial, os valores não mudam. Vasculhei o código e achei duas causas reais:

### 1. O2 TAX não carrega os campos de origem
`useO2TaxAnalytics` não tem `tipoOrigem`, `origemLead`, `fonte`, nem `campanha` — nem no tipo `O2TaxCard`, nem no parse da linha do banco, nem no `toDetailItem`. Consequência: quando o filtro de origem está ativo, todo card de O2 TAX é classificado como **"sem_origem"** e some do resultado (independente de ser evento ou não).

### 2. Valores monetários ignoram o filtro de origem
Em `IndicatorsTab.getRealizedMonetaryForIndicator`, a flag `filtersActive` só considera **Closer** e **SDR**:

```ts
const filtersActive = closerFilterActive || sdrFilterActive;
// se filtersActive === false → retorna null → cai no caminho "sem filtro"
```

Resultado: se você só seleciona **Origem = Eventos** (sem Closer/SDR), a função devolve `null` em `filteredVendasForBU`, e os cards monetários (Faturamento, MRR, Setup, Pontual) somam **tudo** ignorando o filtro de origem. Por isso "nada muda".

## Mudanças

### `src/hooks/useO2TaxAnalytics.ts`
- Adicionar `tipoOrigem`, `origemLead`, `fonte`, `campanha` em:
  - `interface O2TaxCard`
  - parse da linha do banco (`row['Tipo de origem']`, `row['Origem do lead']`, `row['Fonte']`, `row['Campanha']`)
  - `toDetailItem` (para o drill-down também classificar corretamente)

### `src/components/planning/IndicatorsTab.tsx` — `getRealizedMonetaryForIndicator`
- Incluir `origemFilterActive = selectedOrigens.length > 0` em `filtersActive`.
- Em `filteredVendasForBU`:
  - Não excluir BU inteira só por causa de origem (BU sempre pode ter cards de qualquer origem); excluir BU continua valendo só para Closer/SDR.
  - Sempre aplicar `matchesOrigemFilter(card)` na filtragem final, mesmo quando só origem está ativa.
- Ajustar o `sumMonet` da Monetização para também respeitar quando outras origens (que não `monetizacao`) estão selecionadas — já está, mas validar.

### Verificação
- Filtrar Origem = **Eventos** em um período conhecido (jun/26 que tem cards G4) e conferir que:
  - Contadores (MQL, RM, RR, Proposta, Venda) caem para só os cards de evento.
  - Faturamento / MRR / Setup / Pontual também caem (não ficam no total cheio).
  - Drill-down lista apenas cards classificados como Evento (inclusive O2 TAX).
- Limpar filtro e conferir que volta ao consolidado.

## Fora de escopo

- Não mexer no classificador `classifyLeadSource` / `eventSubcategory` (estão corretos após o último ajuste).
- Não mexer em Modelo Atual / Expansão / Oxy Hacker / Monetização — esses já carregam os campos de origem corretamente.
- Não mexer em chart path (já aplica `matchesOrigemFilter`).
