## Objetivo

Ao ler MRR de qualquer card, somar **todos** os campos da row cujo nome contém "mrr" (case-insensitive), em vez de ler só `Valor MRR` / `valor_mrr`. Aplica a todos os hooks de analytics.

## Nova helper compartilhada

Criar `src/lib/mrrFields.ts`:

```ts
// Soma todos os campos numéricos da row cujo nome contém "mrr"
// (case-insensitive), ignorando agregados conhecidos.
const AGGREGATE_KEYS = new Set(['valor_total']);
const parseNum = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[R$\s.]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
export function sumMrrFields(row: Record<string, any>): number {
  if (!row) return 0;
  let total = 0;
  for (const key of Object.keys(row)) {
    if (AGGREGATE_KEYS.has(key)) continue;
    if (/mrr/i.test(key)) total += parseNum(row[key]);
  }
  return total;
}
```

## Uso — substituir leituras pontuais por `sumMrrFields(row)`

Em cada arquivo, trocar as expressões que faziam `parseNumericValue(row['Valor MRR'] || row['valor_mrr'] || 0)` (ou equivalentes) por `sumMrrFields(row)`:

1. `src/hooks/useModeloAtualAnalytics.ts` — L202 (`valorMRR = sumMrrFields(row)`)
2. `src/hooks/useExpansaoAnalytics.ts` — L164 (`valorMRR = sumMrrFields(row)`; manter `= 0` quando `perdido/duplicado`)
3. `src/hooks/useExpansaoMetas.ts` — L137 (`valorMRR: sumMrrFields(row)`)
4. `src/hooks/useO2TaxMetas.ts` — L81, L106 (`valorMRR: sumMrrFields(row) || null`)
5. `src/hooks/useModeloAtualValues.ts` — L100 (`valorMRR: sumMrrFields(row)`)
6. `src/hooks/useIndicatorsRealized.ts` — L145, L174 (`valorMRR = sumMrrFields(row)`)
7. `src/hooks/useOutboundAnalytics.ts` — encontrar leitura de Valor MRR e trocar
8. `src/hooks/useMonetizacaoAnalytics.ts` — a linha L86 já ignora `valor_mrr` como agregado; garantir que a leitura de MRR use `sumMrrFields(row)` (excluindo `valor_mrr` como agregado já está coberto pelo `AGGREGATE_KEYS`).

Se precisar preservar `valor_mrr` como agregado em Monetização, adicionar `'valor_mrr'` ao `AGGREGATE_KEYS` também.

## Comportamento

- Cards com apenas `Valor MRR` continuam iguais.
- Cards com múltiplos campos MRR (ex: `Valor MRR`, `MRR Adicional`, `MRR Extra`, `Valor MRR Recorrente`) passam a somar todos.
- Campos agregados conhecidos (`valor_total`, opcionalmente `valor_mrr` do Monetização) são ignorados para evitar dupla contagem.

## Arquivos

- Novo: `src/lib/mrrFields.ts`
- Editados: `useModeloAtualAnalytics.ts`, `useExpansaoAnalytics.ts`, `useExpansaoMetas.ts`, `useO2TaxMetas.ts`, `useModeloAtualValues.ts`, `useIndicatorsRealized.ts`, `useOutboundAnalytics.ts`, `useMonetizacaoAnalytics.ts`
