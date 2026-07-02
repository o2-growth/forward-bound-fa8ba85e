## Contexto

A Live 02/07 hoje aparece com "8" porque cai no cálculo dinâmico (`computeCounts`) — sem override em `src/data/livesOfficial.ts`, o sistema conta cards Modelo Atual classificados como G4 Live cuja `dataEntrada` está na janela 02/07 → 05/07 (3 dias). Esses 8 cards estão sendo tratados como `inscritos`, o que não é semanticamente correto: são leads que entraram no funil vindos da live.

## Ajuste

Adicionar entrada oficial provisória para a Live 02/07 em `src/data/livesOfficial.ts`, com:

- `inscritos: 0` (placeholder — você vai atualizar em seguida)
- `entraram: 8`
- `mao: 8`
- `venda: 0`

Assim que essa entrada existir, o `LivesSection` para de calcular pelos cards e passa a usar o override oficial — os "8" ficam nas duas linhas corretas do funil (Entraram na live e Levantaram a mão) em vez de aparecer só como Inscritos.

## Alteração

**`src/data/livesOfficial.ts`** — acrescentar uma linha ao objeto `LIVES_OFICIAIS`:

```ts
"2026-07-02": { inscritos: 0, entraram: 8, mao: 8, venda: 0 },
```

Nenhum outro arquivo muda. `LivesSection` já lê `getLiveOverride(l.date)` antes de calcular, então o efeito é imediato no chip "Live 02/07" e no agregado.

## Próximo passo (fora deste plano)

Quando você me passar o número real de inscritos da 02/07, atualizo o `inscritos: 0` para o valor correto no mesmo arquivo — edição de 1 linha.
