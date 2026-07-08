## Problema

No drill-down "Propostas - Onde o Pipeline Está Travando?" (Modelo Atual / não-expansão), a tabela mostra apenas **Valor Total** e **MRR**, sem colunas de **Setup** e **Pontual**, diferente do padrão dos outros drill-downs.

## Correção

Em `src/components/planning/ClickableFunnelChart.tsx` (linhas 490-498), adicionar as colunas `setup` e `pontual` no array `propostaColumns` do ramo não-expansão:

```ts
[
  { key: 'product', label: 'Produto', format: columnFormatters.product },
  { key: 'company', label: 'Empresa' },
  { key: 'value',   label: 'Valor Total', format: columnFormatters.currency },
  { key: 'mrr',     label: 'MRR',     format: columnFormatters.currency },
  { key: 'setup',   label: 'Setup',   format: columnFormatters.currency },
  { key: 'pontual', label: 'Pontual', format: columnFormatters.currency },
  { key: 'responsible', label: 'Closer' },
  { key: 'diasEmProposta', label: 'Dias em Proposta', format: columnFormatters.agingWithAlert },
  { key: 'date', label: 'Data Envio', format: columnFormatters.date },
]
```

Escopo restrito ao ramo não-expansão — o ramo `isExpansaoBU` (Franquia/Oxy) permanece inalterado, pois ali só existe Pontual (já exibido).
