## Problema

Na tabela "Leads Quente" (e demais drawers de temperatura), leads de **Franquia** e **Oxy Hacker** aparecem com `Total = -` mesmo quando têm Pontual preenchido (ex: Arlindo Ferri, Eberson e Sirlene, Marcia oxy hacker, Francisco Carlos).

## Causa

`toDetailItem` em `src/hooks/useExpansaoAnalytics.ts` (linha 537) monta o `DetailItem` com `mrr`, `setup` e `pontual`, mas **não define `total`**. Já os demais BUs (Modelo Atual, Outbound, Monetização) definem `total = mrr + setup + pontual` corretamente.

## Correção

Em `src/hooks/useExpansaoAnalytics.ts`, adicionar no objeto retornado por `toDetailItem`:

```ts
total: (card.valorMRR || 0)
     + (card.valorSetup || 0)
     + (card.taxaFranquia > 0
         ? card.taxaFranquia
         : card.valorPontual > 0
           ? card.valorPontual
           : (card.produto === 'Franquia' ? 140000 : 54000)),
```

Usando exatamente a mesma expressão do `pontual` para manter consistência com o valor exibido na coluna Pontual.

Nenhuma outra alteração é necessária — a coluna Total do DetailSheet já formata `item.total` como moeda quando presente.
