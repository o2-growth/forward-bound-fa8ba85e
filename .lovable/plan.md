## Problema

No drill-down "RM - Estamos Convertendo MQLs em Reuniões?" (e demais modais com KPIs/gráficos acima da tabela), o cabeçalho da tabela não fica fixo ao rolar.

A correção anterior em `DetailSheet.tsx` aplicou `sticky top-0` no `TableHeader`, mas dentro de um wrapper `max-h-[55vh] overflow-auto`. Como o `DialogContent` já possui seu próprio scroll (`flex-1 overflow-y-auto` no conteúdo), há **dois containers de scroll aninhados**: o usuário rola o externo (que contém KPIs + gráficos + tabela) e o `sticky` da tabela só funciona em relação ao container interno — que sai da viewport junto com a rolagem externa. Resultado: o cabeçalho some.

## Correção

Em `src/components/planning/indicators/DetailSheet.tsx`:

- Remover o wrapper interno com `max-h-[55vh] overflow-auto` ao redor de `<Table>`, mantendo apenas `border rounded-lg` para o visual.
- Manter `sticky top-0 z-10 bg-background` no `TableHeader` — agora ele gruda no topo do scroll do `DialogContent` (único container de rolagem).
- Garantir que o `<TableRow>` do header tenha fundo opaco (`bg-background`) para não vazar conteúdo por baixo.

Isso vale para todos os drill-downs comerciais (Propostas, Reuniões/RM, Vendas, etc.), já que todos passam pelo mesmo `DetailSheet`.

## Verificação

- Abrir o card "RM - Estamos Convertendo MQLs em Reuniões?" e rolar a lista de 161 registros: o cabeçalho (Status / Empresa / Closer / Tempo / Faturamento / Data) deve permanecer visível no topo.
- Repetir em "Propostas" e "Contratos Assinados" para confirmar.