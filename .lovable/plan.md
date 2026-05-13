## Objetivo

Corrigir o cálculo de `mrrBaseRealPorMes` para que os meses sem dado real da Oxy (Mai/2026 em diante) usem a fórmula:

```
projetado[m] = projetado[m-1] × (1 − 5%) + 25% × aVender[m-1]
```

usando como `aVender[m-1]` o valor de **"A Vender" do plano** (mesma fonte exibida na tabela do Modelo Atual).

## Resultado esperado para Mai/2026

- Real Abr (Oxy) = R$ 700.153
- A Vender Abr (do plano) = X
- Mai = 700.153 × 0,95 + 0,25 × X = 665.145 + 0,25 × X

E a mesma regra propaga em cascata para Jun → Dez, cada mês adicionando 25% do A Vender do mês anterior.

## Mudanças

### Arquivo único: `src/components/planning/MediaInvestmentTab.tsx`

**1. Ajustar `mrrBaseRealPorMes` (linhas 1180–1202)**

Trocar a projeção churn-only (`lastKnown × (1-churn)^n`) por uma cascata mês a mês que aplica retenção de vendas:

```ts
const RETENCAO_OXY = 0.25;
let lastKnown = 0;
MONTHS_ORDER.forEach((m, idx) => {
  const real = lookup.get(`${PLAN_YEAR}-${m}`) || 0;
  if (real > 0) {
    map[m] = real;
    lastKnown = real;
  } else if (lastKnown > 0) {
    const mesAnterior = MONTHS_ORDER[idx - 1];
    const aVenderAnterior = mrrDynamic.revenueToSell[mesAnterior] || 0;
    map[m] = lastKnown * (1 - CHURN_OXY) + RETENCAO_OXY * aVenderAnterior;
    lastKnown = map[m];
  }
});
```

**2. Adicionar `mrrDynamic` como dependência do `useMemo`**

A fonte `mrrDynamic.revenueToSell` já existe (linha 1446/1486) e representa o "A Vender do plano" antes do recálculo com Oxy real — exatamente o valor pedido. Adicionar `mrrDynamic` ao array de dependências.

**3. Não mexer em**:
- `mrrBaseRealMonthsSet` (badge "Oxy" continua só para meses com dado real).
- `applyPendingToFunnel` (continua sem sobrescrever `mrrBase`).
- `Δ Gap a Realocar` permanece R$ 0 em Mai+ (não há real para comparar).

## Validação

Após a mudança, abrir o popover em Mai/2026 e conferir:
- Badge "Projeção" (não "Oxy").
- Valor projetado ≈ 665.145 + 25% × A Vender de Abr.
- Cascata para Jun usa o novo Mai como base + 25% × A Vender de Mai.

Sem mudanças de UI, sem mudanças de schema, sem novos hooks.
