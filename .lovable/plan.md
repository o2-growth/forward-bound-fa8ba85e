# Plano — Jul/2026: venda preferindo "Contrato assinado" (sem impacto em outros meses)

## Garantia de isolamento temporal

A regra é gate por **data efetiva da ocorrência** (`dataAssinatura ?? dataEntrada`), não por data atual nem por período do filtro. O helper é uma função pura:

```ts
// src/lib/salesDedupPolicy.ts
export function preferContratoAssinado(effectiveDate: Date): boolean {
  return effectiveDate.getFullYear() === 2026 && effectiveDate.getMonth() === 6; // Jul/26
}
```

Consequências:
- Jun/26 e Ago/26 → `false` → mantém regra atual (prefere Ganho). **Byte-idêntico ao comportamento de hoje.**
- Jan–Mai/26, 2025, 2027+ → `false` → inalterado.
- Só quando `effectiveDate` cai dentro de Jul/26 a preferência inverte.

Como o dedup é feito por chave `id|ano-mês`, a decisão de qual registro vence é **local a cada mês**: a escolha em Jul não toca nas chaves de Jun nem Ago.

## Por que a contagem de vendas não muda

Hoje: se um card entrou em "Contrato assinado" e "Ganho" no mesmo mês, ele já conta **1x** (dedup id|mês). Só muda **qual das duas linhas é preservada**. Portanto:
- Total de vendas do mês: idêntico.
- Soma de MRR/Setup/Pontual do card: idêntica (mesmo card, mesmos valores nos dois registros).
- O que muda é o rótulo da fase e a data efetiva no drill-down/lista.

Se um card só entrou em "Ganho" (sem passar por "Contrato assinado") em Jul, ele continua sendo contado como venda com a linha de Ganho — a regra só age quando existem as duas ocorrências no mesmo mês.

## Escopo de arquivos

1. `src/lib/salesDedupPolicy.ts` — novo helper puro `preferContratoAssinado(date)`.
2. `src/hooks/useModeloAtualAnalytics.ts` (bloco `indicator === 'venda'`, ~L654-667): trocar condição de preferência por versão consciente do mês.
3. `src/hooks/useO2TaxAnalytics.ts` (bloco equivalente, ~L446-460): idem.
4. `src/lib/marketingFunnelAggregator.ts` → `dedupSalesByMonthPreferGanho`: inspecionar `ym` da ocorrência; quando `ym === '2026-7'`, prefere Contrato assinado; senão inalterado.
5. `src/hooks/useExpansaoAnalytics.ts` e `src/hooks/useOutboundAnalytics.ts`: hoje usam "primeira entrada por card+indicador+mês" (não há preferência Ganho hoje). Adicionar passo pós-dedup **restrito a Jul/26**: se para o mesmo card existir uma movimentação de "Contrato assinado" em Jul/26, ela substitui a de Ganho selecionada. Fora de Jul/26 o passo é no-op.

Nenhuma mudança em: `funnel_metas`, `sales_realized`, `bu_indicators_config`, metas, DRE, hooks de meta, componentes de UI, edge functions ou schema.

## Verificação antes de encerrar

Após implementar, no preview:
1. Filtrar por Jun/26 (Modelo Atual e O2 TAX) → total de vendas e lista devem ser **idênticos** ao snapshot atual.
2. Filtrar por Ago/26 → idem.
3. Filtrar por Jul/26 → total de vendas **igual**; cards que tinham as duas fases no mês agora aparecem como "Contrato assinado".
4. Rodar `tsgo` para garantir tipos.

Se qualquer contagem de Jun ou Ago divergir, revertemos removendo o helper (mudança é local e sem estado). Reversão total = deletar `salesDedupPolicy.ts` e restaurar as 4 condições originais.
