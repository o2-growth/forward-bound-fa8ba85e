# Adicionar Bruna como closer de Oxy Hacker

## Problema
Na aba **Admin → Metas por Closer**, ao selecionar a BU **Oxy Hacker**, só aparecem Pedro e Daniel. A Bruna não está na lista, então não dá pra configurar a meta dela nem ela é considerada nos rateios e filtros do dashboard.

## Causa
Em `src/hooks/useCloserMetas.ts`, o mapa `CLOSERS_BY_BU` lista apenas Pedro e Daniel para `oxy_hacker`:

```ts
oxy_hacker: ['Pedro Albite', 'Daniel Trindade'],
```

A Bruna já existe no array global `CLOSERS` e já é closer das BUs Modelo Atual e Franquia — falta só liberá-la em Oxy Hacker.

## Mudança
1. **`src/hooks/useCloserMetas.ts`** — adicionar `'Bruna'` na lista `oxy_hacker`:
   ```ts
   oxy_hacker: ['Pedro Albite', 'Daniel Trindade', 'Bruna'],
   ```

Não é preciso migration: a tabela `closer_metas` é (`bu`, `month`, `closer`, `pct`) e linhas novas para Bruna são criadas no primeiro `Salvar`. Defaults vêm como 0%, mantendo a soma 100% atual (Pedro 100 + Daniel 0 + Bruna 0).

## Garantia de que "puxa certinho"
- A atribuição real de vendas/cards a Bruna em Oxy Hacker é feita pelo nome do **Closer** vindo do Pipefy (match por primeiro nome normalizado — ver memória `closers-consolidated-logic` e `Monetary Gauges Closer Filter`). Como Bruna já é reconhecida nas outras BUs com o mesmo matching, o mesmo pipeline funciona em Oxy Hacker assim que ela aparecer na lista.
- O rateio das metas monetárias e de funil para Bruna em Oxy Hacker passa a respeitar o % configurado em `closer_metas` (mesma lógica das outras BUs), inclusive quando o filtro de Closer = Bruna é aplicado no dashboard.
- Após o ajuste, validar no preview: abrir Admin → Metas por Closer → Oxy Hacker, conferir que Bruna aparece com 0%, ajustar % de teste, salvar, e no Dashboard Comercial filtrar Closer = Bruna em Oxy Hacker para confirmar que meta e realizado respondem ao filtro.

## Escopo
Mudança de 1 linha, sem migration, sem alteração de UI/UX.
