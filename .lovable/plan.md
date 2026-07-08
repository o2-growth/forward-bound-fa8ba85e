Inverter a ordem das colunas no drill-down "Vendas - Análise de Valor (TCV)": **SDR antes de Closer**.

Em `src/components/planning/IndicatorsTab.tsx` (case `'venda'`, ~linha 2453), trocar a ordem:

```ts
{ key: 'sdr', label: 'SDR' },
{ key: 'responsible', label: 'Closer' },
```

(essa é a ordem atual, mas o header renderizado mostra Closer antes de SDR — verificar se `responsible` está sendo mesmo o Closer, e se a ordem visual bate).

Também aplicar a mesma ordem SDR→Closer no drawer equivalente de `ClickableFunnelChart.tsx` (buildVendaMiniDashboard) por consistência.
