Adicionar prop `hideTierBreakdown` ao `RevenuePaceChart` e usá-la na instância full-width do `IndicatorsTab` para que o bloco "Contratos por Faixa de Faturamento" não apareça abaixo do gráfico Faturamento (em pace).

**Arquivos**
- `src/components/planning/indicators/RevenuePaceChart.tsx`: nova prop opcional `hideTierBreakdown?: boolean`; envolver o bloco `{tierBreakdown && ...}` com `!hideTierBreakdown && ...`.
- `src/components/planning/IndicatorsTab.tsx`: passar `hideTierBreakdown` no `<RevenuePaceChart />` dentro do wrapper full-bleed.

**Fora do escopo:** nenhuma mudança de dados, lógica ou estilo do gráfico.