## Causa raiz

Confirmei via consulta direta ao Pipefy: o valor real de "Taxa de franquia" do Erenildo Jair de Oliveira é a string **`"104000.0"`** (formato US, ponto como decimal).

Existem dois parsers diferentes lendo o mesmo campo:

- **`useExpansaoAnalytics.ts`** (drill-down / tabela): `parseFloat("104000.0")` → **104000** ✓ → mostra **R$ 104k** corretamente.
- **`useExpansaoMetas.ts`** (acelerômetro / gauge): função `readNum` faz `String(v).replace(/[R$\s.]/g, '').replace(',', '.')`. Isso **remove todos os pontos** (assumindo formato brasileiro "104.000") → vira `"1040000"` → **1.040.000** ✗ → o acelerômetro infla 10× para R$ 1,04M nesse card.

Por isso o gauge mostra **R$ 1,4M** enquanto a tabela soma só **R$ 445k**: o card do Erenildo está sendo contado como R$ 1,04M no gauge e R$ 104k na tabela (diferença de ~R$ 936k, que bate com a discrepância). Isso também explica por que ao filtrar **só Franquia** o erro persiste, e por que MRR/Setup/Pontual ficam consistentes nas outras BUs — só taxaFranquia tem esse parser tóxico.

Os logs do console confirmam: `taxaFranquia=1040000 → valor=1040000` no `useExpansaoMetas`, mas a tabela renderiza R$ 104k.

## O que mudar

### `src/hooks/useExpansaoMetas.ts` — função `readNum` (linhas ~108-117)

Trocar o parser ingênuo por um que detecta o formato do número:

- Se a string contiver **vírgula** → formato BR ("1.040.000,50"): remove pontos, troca vírgula por ponto.
- Caso contrário → formato US/numérico simples ("104000.0", "1040000"): apenas remove `R$` e espaços; **não toca nos pontos**.

Pseudo-código:

```ts
const readNum = (...keys: string[]): number | null => {
  for (const k of keys) {
    const v = row[k];
    if (v !== null && v !== undefined && v !== '') {
      const s = String(v).replace(/[R$\s]/g, '');
      const normalized = s.includes(',')
        ? s.replace(/\./g, '').replace(',', '.')  // BR
        : s;                                       // US / plain
      const n = parseFloat(normalized);
      if (!isNaN(n) && n > 0) return n;
    }
  }
  return null;
};
```

Nenhuma outra mudança necessária. Não mexo em `useExpansaoAnalytics.ts` (já está correto), nem em lógica de funil, metas, MRR Base ou gráficos.

## Resultado esperado

- Acelerômetro "Fat Incremento" cai de R$ 1,4M para o valor correto (~R$ 445k consolidado / R$ 104k Franquia isolada), batendo com a tabela "De Onde Veio o Dinheiro?".
- "Pontual" deixa de inflar pela mesma razão (taxaFranquia entra como pontual quando preenchida).
- Outras BUs (Modelo Atual, O2 TAX, Oxy Hacker) seguem em 100% — não são afetadas porque os valores delas nunca passaram pelo `readNum` problemático com formato US.
- Plan Growth e funil quantitativo não mudam.

## Fora de escopo

- Não altera o sub-produto exibido na tabela (já implementado na rodada anterior).
- Não mexe em metas, redistribuição ou MRR Base.
