Fazer o card "Faturamento (em pace)" ocupar a altura total da viewport (full-screen). O bloco "Contratos por Faixa de Faturamento" continua existindo, mas só aparece ao rolar a página para baixo.

**Arquivos**
- `src/components/planning/indicators/RevenuePaceChart.tsx`:
  - Remover prop `hideTierBreakdown`.
  - Adicionar prop opcional `fullViewport?: boolean`.
  - Quando `fullViewport=true`: aplicar `min-h-screen` no Card e trocar a altura fixa do container do chart (`h-96`) por `h-[calc(100vh-200px)]` para o gráfico encher a tela. O bloco de tier breakdown continua renderizando logo abaixo no fluxo, aparecendo só com scroll.
- `src/components/planning/IndicatorsTab.tsx`:
  - Trocar a prop `hideTierBreakdown` por `fullViewport` no `<RevenuePaceChart />`. Mantém o wrapper full-bleed existente.

**Fora do escopo:** nenhuma mudança em dados, cálculos ou outros componentes.