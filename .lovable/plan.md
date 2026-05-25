# Mostrar sub-produto vendido no drill-down do acelerômetro de Vendas

Hoje, na tabela "Detalhamento por Produto" do drill-down de Vendas, todos os contratos de Modelo Atual aparecem como "CaaS" e todos de O2 TAX como "O2 TAX", porque o campo `product` está fixo no código. O usuário quer ver o sub-produto real vendido dentro daquela BU (ex.: CFOaaS, Oxy, Gênio, SaaS Oxy, Oxy + Gênio etc.), que já existe no Pipefy no campo `"Produtos"`.

## O que mudar

### 1. `src/hooks/useModeloAtualAnalytics.ts`
- Adicionar `produto?: string` na interface `ModeloAtualCard`.
- Em `parseCardRow`, ler `row['Produtos']` (o `query-external-db` já faz `SELECT *`, então o campo vem disponível) e gravar em `produto`.
- Em `toDetailItem`, trocar `product: 'CaaS'` por `product: card.produto?.trim() || 'CaaS'` (fallback preserva o comportamento atual quando o campo está vazio).

### 2. `src/hooks/useO2TaxAnalytics.ts`
- Mesma mudança: adicionar `produto?: string` no card, ler `row['Produtos']` no parse e usar `product: card.produto?.trim() || 'O2 TAX'` no `toDetailItem`.

### 3. `src/hooks/useExpansaoAnalytics.ts`
- Já usa `card.produto` (Franquia / Oxy Hacker). Sem mudanças.

### 4. `src/components/planning/IndicatorsTab.tsx`
- Nenhuma mudança necessária: a tabela "Detalhamento por Produto" já agrega por `i.product`, então passará a quebrar automaticamente em CFOaaS, Oxy, Gênio, SaaS Oxy, etc.

## Resultado esperado
No drill-down do card de Vendas, a tabela "Detalhamento por Produto" passará a mostrar uma linha por sub-produto realmente vendido (ex.: CFOaaS, Oxy, Gênio, Oxy + Gênio, SaaS Oxy, Franquia, Oxy Hacker, O2 TAX-…), com Contratos / MRR / Setup / Pontual / TCV / Ticket Médio por sub-produto. Contratos sem o campo `"Produtos"` preenchido caem no fallback da BU.

## Fora de escopo
- Não altera business logic de metas, funil ou MRR.
- Não altera o gráfico de "Composição do Faturamento".
- Não cria filtros novos por produto (pode ser próximo passo se você quiser).
