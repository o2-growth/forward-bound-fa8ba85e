## Diagnóstico

A tela do screenshot é renderizada por `src/components/planning/MediaInvestmentTab.tsx`, **não** pelo hook `usePlanGrowthData` que editamos. Esse componente tem **toda a lógica de funil duplicada internamente** (`calculateMrrAndRevenueToSell`, `calculateReverseFunnel`, constantes `mrrInicial=700.000`, `valorVenderInicial=400.000`).

Por isso a coluna **MRR Base** continua mostrando os valores sintéticos:
- Jan 725.000 = 1.125.000 − 400.000
- Fev 781.500, Mar 834.610, Abr 909.533 (cascata 6% churn + 25% retenção)

Os valores reais Oxy estão corretos no DB (`mrr_base_monthly`, year=2026):
- Jan 705.268,07 | Fev 746.847,17 | Mar 733.281,13 | Abr 700.152,57

E a regra que o usuário impôs é: **as metas de Jan–Abr (MQL, RM, RR, propostas, vendas, faturamento_meta, faturamento_vender, investimento) NÃO podem mais mudar**, mesmo que o MRR Base mude. Isso já está protegido pelo `is_locked = true` em `funnel_metas` e respeitado em `usePlanGrowthData.ts` — mas **`MediaInvestmentTab.tsx` ignora completamente o `funnel_metas` para o cálculo do funil base**.

## Objetivo

Em `MediaInvestmentTab.tsx`:

1. Coluna **MRR Base** dos meses Jan–Abr/2026 mostra valores reais da Oxy (`mrr_base_monthly`).
2. Meses futuros (Mai–Dez) continuam com a projeção sintética (não mexer).
3. As metas congeladas (`is_locked = true` em `funnel_metas`) sobrescrevem quantidades, faturamento_meta, faturamento_vender e investimento — mesmo que o MRR Base mude. Isso garante que MQL Mar continue 395, "A Vender" Mar continue 579.329, etc.

## Solução

**Arquivo único a editar:** `src/components/planning/MediaInvestmentTab.tsx`

### Passo 1 — importar hooks

```tsx
import { useMrrBase } from "@/hooks/useMrrBase";
import { useFunnelMetas } from "@/hooks/useFunnelMetas";
```

Dentro do componente:

```tsx
const { mrrBaseData } = useMrrBase();
const { hasFunnelForBU, getFunnelForBU } = useFunnelMetas();

const mrrBaseRealPorMes = useMemo(() => {
  const map: Record<string, number> = {};
  (mrrBaseData || [])
    .filter(r => r.year === 2026)
    .forEach(r => { map[r.month] = Number(r.value) || 0; });
  return map;
}, [mrrBaseData]);
```

### Passo 2 — aplicar overrides ao `modeloAtualFunnel`

Após o `useMemo` que calcula `modeloAtualFunnel` (linha ~1285), adicionar uma camada que:

a) Sobrescreve `mrrBase` com Oxy quando houver valor.
b) Quando `mrrBase` muda **e o mês está locked**, mantém `faturamentoMeta`, `faturamentoVender`, `investimento` e quantidades (leads, mqls, rms, rrs, propostas, vendas) **exatamente** como o snapshot.
c) Quando `mrrBase` muda **e o mês NÃO está locked** (futuro), recalcula `faturamentoVender = faturamentoMeta − mrrBase` para manter coerência visual, mas isso só afeta meses não trancados.

```tsx
const modeloAtualFunnelComOxy = useMemo(() => {
  const hasFixed = hasFunnelForBU('modelo_atual');
  const fixedRows = hasFixed ? getFunnelForBU('modelo_atual') : [];

  return modeloAtualFunnel.map(d => {
    const realMrr = mrrBaseRealPorMes[d.month];
    const fixed = fixedRows.find(f => f.month === d.month);
    const isLocked = fixed?.is_locked === true;

    // Se o mês está locked, snapshot é a verdade absoluta para metas/quantidades
    if (isLocked && fixed) {
      const fatMeta = Number(fixed.faturamento_meta) || d.faturamentoMeta;
      const fatVender = Number(fixed.faturamento_vender) || d.faturamentoVender;
      const invest = Number(fixed.investimento) || d.investimento;
      return {
        ...d,
        mrrBase: realMrr > 0 ? realMrr : d.mrrBase,
        faturamentoMeta: fatMeta,
        faturamentoVender: fatVender,
        investimento: invest,
        leads: fixed.leads,
        mqls: fixed.mqls,
        rms: fixed.rms,
        rrs: fixed.rrs,
        propostas: fixed.propostas,
        vendas: fixed.vendas,
      };
    }

    // Mês não locked: só sobrescreve mrrBase se houver Oxy
    return realMrr > 0 ? { ...d, mrrBase: realMrr } : d;
  });
}, [modeloAtualFunnel, mrrBaseRealPorMes, hasFunnelForBU, getFunnelForBU]);
```

### Passo 3 — usar `modeloAtualFunnelComOxy` na renderização

Substituir todas as referências a `modeloAtualFunnel` que alimentam a tabela visual e os cards (linhas ~1664, ~2651 e onde a tabela é renderizada) por `modeloAtualFunnelComOxy`.

**Importante:** o `applyPendingToFunnel` (edição manual) continua usando `modeloAtualFunnel` original como base — pendingChanges são edições do usuário em meses futuros, não devem afetar locked. Aplicar `applyPendingToFunnel` em cima de `modeloAtualFunnelComOxy`.

### Passo 4 — não mexer em outras BUs

O2 Tax / Oxy Hacker / Franquia não têm MRR Base por design (só têm vendas pontuais/setup). Manter como está.

## Resultado esperado na tela

| Mês | Meta | MRR Base (Oxy) | A Vender |
|-----|------|----------------|----------|
| Jan | 1.125.000 | **705.268** | 419.732 (snapshot) |
| Fev | 1.181.500 | **746.847** | 434.653 (snapshot) |
| Mar | 1.334.610 | **733.281** | 579.329 (snapshot) |
| Abr | 1.509.533 | **700.153** | 809.381 (snapshot) |

E **MQL Mar = 395, "A Vender" Mar = 579.329 e investimento Mar travado** — porque `is_locked` ainda manda nas quantidades.

## Verificação pós-fix

1. Conferir MRR Base Jan–Abr na tabela = valores Oxy do DB (705k / 747k / 733k / 700k).
2. Conferir MQL Mar = 395 (não pode mudar).
3. Conferir "A Vender" Mar = 579.329.
4. Conferir Mai+ inalterado (MRR Base segue projeção sintética).
5. Gauges de MQL voltam à cor original.
