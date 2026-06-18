## Objetivo

Substituir a aproximação "média aritmética por pessoa" no drill-down de categoria (ex.: "Equipe CaaS") pelos lançamentos reais — fornecedor por fornecedor, mês a mês — usando o novo endpoint `dre-drill-down`. Resolve o gap atual em que Oxy não expunha lançamento individual.

## Onde aparece

Em `PessoasTab` → seção "3.2 Custo de pessoal" → card "Custo de pessoal por BU" → expandir uma BU → expandir uma categoria.

Hoje esse painel mostra:
- Painel A: evolução mensal da categoria (Oxy)
- Painel B: pessoas do Pipefy do BU + valor médio aritmético

Vai virar:
- Painel A: evolução mensal da categoria (Oxy) — mantém
- Painel B: **Lançamentos reais por fornecedor** (novo) — vem do `dre-drill-down`, com valores reais mês a mês + total. Removemos a média inventada e o aviso amarelo.
- Painel C (colapsado/aside): pessoas do Pipefy do BU (mantido como referência cruzada, sem valor monetário).

## Mudanças técnicas

1. `supabase/functions/fetch-oxy-finance/index.ts` — adicionar action `dre_drill_down`:
   - Input: `{ category: string, startDate, endDate }` (CNPJ fixo `23.813.779/0001-60`).
   - Chama `GET /v2/dre/dre-drill-down?startDate=…&endDate=…&cnpjs[]=23.813.779%2F0001-60&category=<encoded>`.
   - Repassa resposta `{ period, periods, data: [{ label, type, data: [{ period, value }] }] }`.
   - Trata 500 ("out of memory" quando categoria não existe) → retorna 404 com mensagem amigável.

2. `src/hooks/useDreDrillDown.ts` (novo) — `useQuery` por `(category, start, end)`, `enabled` só quando categoria está aberta, `staleTime` 10min. Retorna `{ items: [{ label, type, valor, serie }], total, isLoading, error }`.

3. `src/components/planning/PessoasTab.tsx`:
   - Quando o usuário expande uma categoria (`openCat`), dispara o hook com o `c.label`.
   - Substitui Painel B pelo novo "Lançamentos por fornecedor" (tabela: Fornecedor · valor total · % do total · mini-série mensal opcional).
   - Mantém pessoas do Pipefy como info secundária menor (sem média monetária).
   - Remove o aviso amarelo "Oxy não expõe lançamento individual".

## Não muda

- DRE por BU, CashflowChart, MetaVsRealized, FinancialTab.
- `usePersonnelCostByBu` (continua agregando categorias do `dre_categories`).
- `dreByBU`, regras de BU, categorias corporativas.
- Categorias que não sejam de "Pessoal" continuam não tendo drill-down (escopo limitado ao painel de Pessoas).

## Validação

- Abrir "Equipe CaaS" em mar/2026 → lista de fornecedores deve somar exatamente o valor mostrado da categoria (regime de competência).
- Período multi-mês: cada fornecedor mostra só os meses em que houve lançamento + total.
- Categoria com label errado → toast/erro tratado, não quebra a UI.
