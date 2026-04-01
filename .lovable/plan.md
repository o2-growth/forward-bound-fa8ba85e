

## Bug: Fat Incremento não mostra valor com período 01/03-31/03 para Franquia

### Causa raiz

O hook `useExpansaoMetas.ts` (Franquia) **não aplica a lógica de `dataAssinatura`** para vendas. Ele usa apenas `dataEntrada` (timestamp do movimento no Pipefy), que pode cair em abril dependendo do horário UTC.

Os outros hooks já estão corretos:
- `useExpansaoAnalytics.ts` — usa `dataAssinatura` para vendas (por isso o volume gauge mostra 3 vendas)
- `useOxyHackerMetas.ts` — usa `dataAssinatura` para vendas

Resultado: o gauge de volume (3 vendas) vem do analytics hook (que usa a data de assinatura em março), mas o Fat Incremento vem do metas hook (que usa `dataEntrada` raw, que cai fora do período 01/03-31/03). Quando o usuário estende para 01/04, o `dataEntrada` raw é capturado.

### Correção

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useExpansaoMetas.ts` | Adicionar parsing de `Data de assinatura do contrato` e usar `fixPossibleDateInversion` para sobrescrever `dataEntrada` quando a fase é `Contrato assinado`, idêntico ao que já existe em `useOxyHackerMetas.ts` |

### Detalhes técnicos

1. Importar `fixPossibleDateInversion` de `./dateUtils`
2. Adicionar função `parseDateOnly` (parse YYYY-MM-DD sem shift de timezone)
3. No loop de parsing dos movements (linhas 83-104), para a fase `Contrato assinado`, ler `row['Data de assinatura do contrato']` e aplicar `fixPossibleDateInversion(dataAssinatura, dataEntrada)` antes de criar o objeto movement
4. Isso alinha o `useExpansaoMetas` com os outros hooks e garante que as datas de venda sejam consistentes entre volume e valor monetário

