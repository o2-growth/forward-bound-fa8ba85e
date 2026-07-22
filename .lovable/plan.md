## Problema
Os tooltips do Recharts nos gráficos do G4 Consolidated Dashboard (Motivos de Perda, Barras por Evento, Pie de Temperatura) estão usando o `contentStyle` padrão do Recharts — fundo branco com texto claro/vermelho — ficando ilegíveis no tema escuro (conforme screenshot: "Orçamento incompatível / value : 2" quase invisível).

## Ajuste
Em `src/components/planning/g4/G4ConsolidatedDashboard.tsx`, padronizar os 3 `<Tooltip />` (linhas 285, 311, 388) usando os tokens semânticos do design system (mesmo padrão do `LossReasonsBar.tsx`):

```tsx
<Tooltip
  contentStyle={{
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--popover-foreground))",
    fontSize: "12px",
  }}
  itemStyle={{ color: "hsl(var(--popover-foreground))" }}
  labelStyle={{ color: "hsl(var(--popover-foreground))", fontWeight: 600 }}
/>
```

Isso garante contraste correto em light e dark mode, sem alterar dados nem lógica.