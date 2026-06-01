## Objetivo

Transformar **Insights Comerciais** numa página própria (sub-aba ao lado de "Funil & Metas" / "Typeform" / "Typeform vs IA"), igual ao padrão Typeform — com seu próprio seletor de período e visão consolidada de todas as BUs.

## Estado atual

- `InsightsTab` existe mas está enterrado em `AnalyticsSection` (dentro de cada BU, atrás de um collapsible).
- `IndicatorsWrapper.tsx` já tem o padrão de sub-tabs comerciais (Funil / Typeform / Typeform vs IA).

## Mudanças

### 1. Nova página `src/components/planning/insights/InsightsPage.tsx`
- Header com título "Insights Comerciais" + subtítulo (igual ao FinancialTab).
- **Seletor de período** próprio (`DateRangePickerGA`) com default = mês corrente.
- Toggle "Ver só meus" (filtra insights onde usuário logado é o vendedor — usa `useAuth`).
- Reusa o `InsightsTab` atual passando `startDate` / `endDate` selecionados.
- Botão **Atualizar** (invalida queries dos analytics hooks).

### 2. Registrar como sub-aba em `IndicatorsWrapper.tsx`
- Trocar grid de 3 colunas → 4 colunas em `Comercial`.
- Adicionar `TabsTrigger value="insights"` com ícone `Sparkles` no início da lista.
- `TabsContent value="insights"` renderiza `<InsightsPage />`.
- Tornar "insights" o `defaultValue` da aba Comercial (primeira coisa que aparece).

### 3. Limpeza
- Remover a tab "Insights" de `AnalyticsSection.tsx` (volta a ter 4 tabs: Pipeline / Conversões / Perdas / Segmentação).
- Reverter `useState(true)` → `useState(false)` no collapsible de Análises Detalhadas (volta a iniciar fechado, como era originalmente).

## Resultado

Ao abrir o dashboard:
1. Aba **Indicadores → Comercial** abre direto em **Insights** (ícone ✨).
2. Página dedicada com período próprio mostra cards Críticos / Atenção / No verde consolidando Modelo Atual, O2 TAX, Expansão e Outbound.
3. Demais sub-abas (Funil & Metas, Typeform, Typeform vs IA) continuam acessíveis.

## Fora do escopo

- Integração IA "provável causa" (próximo passo)
- Snapshots em `commercial_insights_snapshots`
- Regras R2–R4, R7–R8, R10–R11, R13–R15 restantes
