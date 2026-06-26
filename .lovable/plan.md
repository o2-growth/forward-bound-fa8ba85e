## Objetivo
Nos modais de drill-down de Indicadores Comercial (acelerômetros, gauges monetários, etc.), manter a primeira linha (cabeçalho com nomes das colunas) **fixa** ao rolar a tabela, para que o usuário sempre saiba qual coluna está vendo.

## Onde
Componente único usado por todos os clicáveis: `src/components/planning/indicators/DetailSheet.tsx`.

Todos os drill-downs (Modelo Atual, O2 TAX, Expansão, Oxy Hacker, Outbound, Monetização, Cenário de Caixa, Temperatura, etc.) renderizam via `DetailSheet`, então um único ajuste cobre toda a aba Comercial.

## Mudanças

1. **Container de scroll dedicado para a tabela**
   - Hoje o scroll vertical acontece no wrapper externo (`flex-1 overflow-y-auto`), que engloba KPIs, gráficos, critérios e a tabela. Isso impede `position: sticky` no `<thead>` de funcionar de forma consistente.
   - Envolver a `<Table>` num `div` com altura limitada (`max-h-[55vh] overflow-auto`) e borda, mantendo KPIs/gráficos acima como conteúdo normal.

2. **Tornar `<TableHeader>` sticky**
   - Adicionar classes no `<TableHeader>`: `sticky top-0 z-10 bg-background` (com `shadow-sm` sutil para destacar ao rolar).
   - Garantir que `<TableHead>` não fique transparente: usar `bg-background` também na linha do header.

3. **Sem mudanças de lógica/negócio** — apenas apresentação. Nenhum outro arquivo precisa ser alterado.

## Validação
- Abrir um acelerômetro com muitos registros (ex.: Propostas Enviadas / Vendas) em Indicadores Comercial e rolar a tabela — o cabeçalho deve permanecer visível no topo.
- Conferir que ordenação por coluna (clique no header) continua funcionando.
- Conferir em modo claro e escuro (uso de `bg-background` resolve ambos).
