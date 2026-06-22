# Plan to add "Receita total" KPI alongside Custo de Pessoal KPI

The goal is to implement the missing "Receita total" KPI next to the existing KPIs under "3.2 Custo de pessoal" in the Pessoas tab, and link its toggle behavior to the `showCustoReceitaCharts` state so clicking it also reveals/hides the charts.

## Implementation Steps

### 1. Add "Receita total" KPI in `src/components/planning/PessoasTab.tsx`
- Insert a new `<Kpi>` element in the KPIs grid for "3.2 Custo de pessoal" (right after or before the `Custo / Receita` KPI).
- Configure the KPI with:
  - **Title**: `Receita total ${showCustoReceitaCharts ? "▾" : "▸"}`
  - **Value**: `formatCurrencyCompact(receitaPeriodo)`
  - **Subtitle**: `Soma das BUs · clique p/ ${showCustoReceitaCharts ? "fechar" : "ver gráficos"}`
  - **Icon**: `DollarSign` (or an appropriate icon from lucide-react)
  - **IsLoading**: `oxy.isLoading`
  - **OnClick**: `() => setShowCustoReceitaCharts((v) => !v)` (matches the behavior of the `Custo / Receita` KPI to toggle the charts)
- Adjust the grid columns class from `lg:grid-cols-5` to `lg:grid-cols-6` (or keep it responsive) so the 6 KPIs fit beautifully in a single row on desktop screens.

## Technical Details
- File to be modified: `src/components/planning/PessoasTab.tsx`
- Variables used: `receitaPeriodo` (already defined), `showCustoReceitaCharts`, `setShowCustoReceitaCharts`, `oxy` (already in scope).
