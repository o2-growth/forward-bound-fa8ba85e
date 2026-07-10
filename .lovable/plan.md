## Causa

Quando o Pace Comercial está aberto, `IndicatorsTab.tsx` faz um `return` antecipado (L3396-3426) renderizando só `<CommercialPaceDashboard />`. O `<DetailSheet />` só é montado no return principal (L3957), então o clique dispara `setDetailSheetOpen(true)` mas não há sheet no DOM para abrir.

## Correção

No branch `if (commercialPaceOpen)` do `IndicatorsTab.tsx`, envolver o `<CommercialPaceDashboard />` em um Fragment e renderizar o `<DetailSheet />` logo abaixo, com as mesmas props do sheet do return principal.

## Arquivo

- `src/components/planning/IndicatorsTab.tsx` (branch `commercialPaceOpen`, ~L3396-3426)
