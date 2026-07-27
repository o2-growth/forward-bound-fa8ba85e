## Objetivo
A aba **G4** dentro de Indicadores passa a mostrar exatamente o mesmo conteúdo da página pública `/dash-g4`: apenas o Dashboard Consolidado G4.

## Mudanças
1. `src/components/planning/G4Tab.tsx`
   - Remover o render de `<G4RealSection />` e o import correspondente.
   - Manter o cabeçalho (título "Dashboard G4" + badge) e `<G4ConsolidatedDashboard />`.
   - Ajustar o subtítulo para descrever o dashboard consolidado (categorias, funil por live/evento, vendas), já que o texto atual descreve o funil antigo.
2. `src/components/planning/g4/G4RealSection.tsx` deixa de ser usado. Verifico se há outra referência; se não houver, removo o arquivo (junto com `LiveDetailDialog.tsx` caso seja usado só por ele) para não deixar código morto.

## Fora do escopo
Nenhuma alteração no `G4ConsolidatedDashboard`, na edge function `g4-metrics` ou na página pública.