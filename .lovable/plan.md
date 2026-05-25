## Detalhar "Produto Contratado" no drill-down de Vendas

### Problema
O pie "Produto Contratado (TCV)" ficou visualmente misturado com o pie "Composição do Faturamento" — usuário não consegue ver claramente o detalhamento por produto (CaaS, O2 TAX, Oxy Hacker, Franquia).

### Solução
Substituir o pie simples por um **detalhamento tabular** dentro da seção "Análise Visual", usando o `extraContent` do `DetailSheet` (já suportado).

**Arquivo:** `src/components/planning/IndicatorsTab.tsx` (case `'venda'`)

1. Remover o chart `'Produto Contratado (TCV)'` que adicionamos.
2. Calcular por produto agregados a partir de `itemsWithTCV`:
   - Contratos (count)
   - MRR somado
   - Setup somado
   - Pontual somado
   - TCV somado
   - Ticket Médio TCV (TCV / count)
3. Passar via novo state `detailSheetExtraContent` (já existente no DetailSheet) um bloco JSX:
   - Título: "Detalhamento por Produto Contratado"
   - Tabela compacta com colunas: Produto (badge), Contratos, MRR, Setup, Pontual, TCV, Ticket Médio
   - Linhas ordenadas por TCV desc
   - Linha total no rodapé
4. Verificar se `setDetailSheetExtraContent` já existe; se não, adicionar o state + prop no render do `DetailSheet`.

### Observações
- Mantém o KPI "Ciclo Médio" já adicionado.
- Apresentação pura, sem mudar dados nem hooks.
