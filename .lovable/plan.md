## Acelerômetro Custo/Receita — expansão inline com gráficos

Hoje o card "Custo / Receita" (`PessoasTab.tsx` linha 633) abre o drill drawer com lista por BU. Vou trocar o comportamento para **expandir inline abaixo da linha de KPIs**, mostrando os gráficos pedidos.

### Mudanças

**1) Estado local de expansão em `PessoasTab.tsx`**
- `const [showCustoReceitaCharts, setShowCustoReceitaCharts] = useState(false)`
- `onClick` do KPI "Custo / Receita" passa a alternar esse estado (em vez de abrir o drawer).
- Aparece um caret/seta no título indicando estado expandido.

**2) Nova seção logo após o grid de KPIs da 3.2** (renderizada só quando `showCustoReceitaCharts`)

Dois gráficos lado a lado (grid `md:grid-cols-2`), usando o range de datas já selecionado:

- **Gráfico A — Absoluto: Folha vs Receita (linha)**
  - Eixo X: meses do range (yyyy-MM)
  - Linha 1: Folha total mensal (soma `pc12m.porBu` + `corporativo` por mês)
  - Linha 2: Receita total mensal (`receitaPorMes`)
  - Tooltip com valores em R$ compactos.

- **Gráfico B — Composto: Receita por BU (linhas) + % Custo/Receita (barras)**
  - Eixo X: meses do range
  - Linhas (uma por BU CaaS/SaaS/TAX/Expansão): receita mensal de cada BU via `oxy.dreByBU`
  - Linha extra pontilhada: Receita total
  - Barras (eixo Y secundário, %): % Custo de pessoal total / Receita total do mês

**3) Componente novo** `src/components/planning/pessoas/CustoReceitaCharts.tsx`
- Recebe: `dateRange`, `pc12m`, `receitaPorMes`, `oxyDreByBU`
- Calcula séries mensais cobertas pelo range
- Renderiza com Recharts (`LineChart`, `ComposedChart`) já usado no projeto
- Cores: tokens semânticos do tema (sem hex hardcoded)

### Fora de escopo
- Não adiciono KPI separado para "receita total de pessoas" — a receita já é exibida no subtítulo do card Custo/Receita e nos gráficos da expansão.
- Sem mudanças de dados/hook, só consumo do que já está disponível (`pc12m`, `receitaPorMes`, `oxy.dreByBU`).
- Drill drawer atual do "Custo / Receita por BU" é removido (substituído pela expansão).