## Causa raiz (confirmada com a aritmética dos números do print)

Meu fix em `useCloserMetas.getFilteredMeta` está funcionando — para Pedro + Consolidado, ele zera a meta de **todas** as BUs em que Pedro opera (`modelo_atual`, `oxy_hacker`, `franquia`). A BU `o2_tax` já é descartada antes porque Pedro não está em `BU_CLOSERS.o2_tax`.

Resultado: `total = 0` em `getMetaForIndicator` (linha 902 de `IndicatorsTab.tsx`).

O problema é a **última linha** dessa função (linha 935):

```ts
return total > 0 ? total : Math.round(indicator.annualMeta * periodFraction);
```

Quando o total dá 0, ele cai num fallback genérico baseado em `annualMeta` (2400/1200/960/480/240) prorateado pelo período. Para 5 dias:

| Indicador | annualMeta × 5/365 | Print |
|---|---|---|
| MQLs | 2400 × 5/365 = **32,87 → 33** | 33 ✅ |
| Reuniões Agendadas | 1200 × 5/365 = **16,4 → 16** | 16 ✅ |
| Reuniões Realizadas | 960 × 5/365 = **13,15 → 13** | 13 ✅ |
| Propostas | 480 × 5/365 = **6,57 → 7** | 7 ✅ |
| Vendas | 240 × 5/365 = **3,29 → 3** | 3 ✅ |

Bate exato. Ou seja, o "0" legítimo está sendo substituído pelo fallback.

Os acelerômetros monetários (R$ 0 corretos) não têm esse fallback — por isso só os de cima quebram.

## Plano

**Único arquivo: `src/components/planning/IndicatorsTab.tsx` (1 linha)**

Em `getMetaForIndicator`, distinguir "sem dado no DB" (fallback faz sentido) de "filtrado a 0 por pessoa" (deve permanecer 0):

- Se há filtro ativo de closer (`effectiveSelectedClosers.length > 0`) ou de SDR (`effectiveSelectedSDRs.length > 0`), **não** aplicar fallback — retornar `total` diretamente (mesmo se 0).
- Sem filtro de pessoa: manter o fallback atual `total > 0 ? total : annualMeta * periodFraction` (preserva comportamento histórico para BUs sem meta cadastrada).

Aproximadamente:

```ts
const hasPersonFilter = effectiveSelectedClosers.length > 0 || effectiveSelectedSDRs.length > 0;
if (hasPersonFilter) return total;
return total > 0 ? total : Math.round(indicator.annualMeta * periodFraction);
```

## Validação

- Pedro + Consolidado, 01–05/Jun: Meta dos 5 cards de cima → **0** (em vez de 33/16/13/7/3).
- Sem filtro de closer/SDR, Consolidado: cards continuam mostrando os mesmos valores de hoje (fallback preservado).
- Daniel + Modelo Atual (que tem `closer_absolute_metas` real): cards mostram o rateio normal.

## Fora de escopo
- Não mexer em `useCloserMetas` (o guard já está correto).
- Não mexer em séries do gráfico (`getMonthlyMetasFromFunnel`) nem nos cards monetários (já corretos).
- Não tocar em realizado.
