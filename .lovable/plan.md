## Diagnóstico

A coluna **MRR Base** na tabela do Plan Growth (Modelo Atual) **não está lendo da tabela `mrr_base_monthly`** (verdade Oxy). Ela exibe um valor **calculado sinteticamente** no frontend:

- Janeiro: `Meta − 400.000` (constante hardcoded `valorVenderInicial = 400000`)
- Fev em diante: cascata `MRR_anterior × (1 − 6% churn) + (a_vender_anterior × 25% retenção)`

Por isso a tela mostra:
- Jan: R$ 725.000 (Oxy real: R$ 705.268,07 — diferença R$ 19.732)
- Fev: R$ 781.500 (Oxy real: R$ 746.847,17 — diferença R$ 34.653)
- Mar: R$ 834.610 (Oxy real: R$ 733.281,13 — diferença R$ 101.329)
- Abr: R$ 909.533 (Oxy real: R$ 700.152,57 — diferença R$ 209.380)

A divergência cresce mês a mês porque é uma projeção teórica que diverge cada vez mais do real.

**Implicação importante:** o snapshot que congelamos ontem (`is_locked = true` em `funnel_metas`) gravou o `mrr_base_planejamento` desses 4 meses com valores Oxy (ex.: Mar = 755.281,13 pré-correção; Jan = 705.268,07). Ou seja, **o lock está correto e protege as quantidades de funil** — só a coluna visual é que está usando outra fonte. Como `mrrBase` no objeto do funnel é só exibido (não cascateia para mqls/rms), trocar a fonte não vai mexer nas metas congeladas.

## Objetivo

Fazer a coluna **MRR Base** dos meses fechados (Jan–Abr/2026) mostrar exatamente o valor real da Oxy lido de `mrr_base_monthly`, mantendo:
- Metas congeladas (Jan–Abr) intocadas — quantidades, faturamento_meta, faturamento_vender
- Lógica de projeção sintética para meses futuros (Mai+) inalterada
- "A Vender" dos meses congelados continua vindo do snapshot `funnel_metas.faturamento_vender`

## Solução

### 1. Ler `mrr_base_monthly` no `usePlanGrowthData`

Adicionar leitura de `mrr_base_monthly` (year=2026) via novo hook `useMrrBase` (já existe — só importar). Construir `mrrBaseRealPorMes: Record<string, number>` a partir dos registros do DB.

### 2. Sobrescrever `mrrBase` no funnel quando houver valor real

No merge do `modeloAtualFunnel`, para CADA mês:

- Se existe valor em `mrr_base_monthly` para o mês → `mrrBase = valor_oxy` (sempre, independente de lock)
- Senão → mantém o valor da projeção sintética (meses futuros)

Isso garante que a coluna mostre Oxy para Jan–Abr (valores reais) e a projeção para Mai–Dez (planejamento).

### 3. Garantir que metas congeladas continuem intactas

O snapshot `is_locked` continua sobrescrevendo `faturamentoMeta`, `faturamentoVender`, `investimento` e quantidades. A única mudança é que o `mrrBase` exibido passa a ser o real (Oxy), não o planejado de quando a meta foi montada. Isso é **exatamente o que o usuário quer**: ver a verdade Oxy na coluna, sem afetar o resto do plano.

### 4. (Opcional) Tooltip explicativo

Em meses com `is_locked = true` e onde `mrrBase exibido (Oxy real) ≠ mrr_base_planejamento (snapshot)`, mostrar tooltip discreto: *"MRR Base real (Oxy): R$ X. Planejamento original usou: R$ Y."*

## Detalhes técnicos

**Arquivo a editar:** `src/hooks/usePlanGrowthData.ts`

```typescript
// Adicionar:
import { useMrrBase } from './useMrrBase';

// Dentro do hook:
const { mrrBaseData } = useMrrBase(2026); // já existe
const mrrBaseRealPorMes = useMemo(() => {
  const map: Record<string, number> = {};
  (mrrBaseData || []).forEach(r => { map[r.month] = Number(r.value) || 0; });
  return map;
}, [mrrBaseData]);

// No merge final do modeloAtualFunnel, após aplicar lock:
return modeloAtualFunnel.map(d => {
  const real = mrrBaseRealPorMes[d.month];
  return real > 0 ? { ...d, mrrBase: real } : d;
});
```

**Arquivos NÃO afetados:**
- `funnel_metas` (snapshot mantido)
- `monetary_metas` (metas mantidas)
- `mrr_base_monthly` (já está com valores Oxy corretos)
- Cálculo de `faturamentoVender` para meses futuros (mantido)

## Resultado esperado

Após o fix, a tabela vai mostrar:

| Mês | Meta | MRR Base (Oxy) | A Vender |
|-----|------|----------------|----------|
| Jan | 1.125.000 | **705.268** | 419.732 (do snapshot) |
| Fev | 1.181.500 | **746.847** | 434.653 (do snapshot) |
| Mar | 1.334.610 | **733.281** | 579.329 (do snapshot) |
| Abr | 1.509.533 | **700.153** | 809.381 (do snapshot) |

E as metas (MQL, RM, RR, propostas, vendas) **continuam idênticas** porque o lock já está ativo.

## Verificação pós-fix

1. Conferir que MRR Base na tela = valores Oxy do DB
2. Conferir que MQL Mar continua = 395 (não pode mudar)
3. Conferir que gauges de MQL voltam à cor original (amarelo/verde, não vermelho)
4. Conferir que "A Vender" Mar = 579.329 (snapshot, não recalculado)
