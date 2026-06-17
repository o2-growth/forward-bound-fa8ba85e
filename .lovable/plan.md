# Plano: Sondar endpoints Oxy em busca de lançamento individual

## Objetivo
Antes de construir UI ou tabela de salários, descobrir se a API da Oxy expõe lançamentos individuais com fornecedor/CNPJ — o que tornaria o match por pessoa automático.

## Estratégia
Adicionar uma única action genérica `probe` no edge function `fetch-oxy-finance` que aceita `{ path, queryParams }` e devolve `{ status, body (truncado em 8KB) }`. Não muda nenhum endpoint existente. Em seguida, eu rodo via `supabase--curl_edge_functions` uma bateria de paths candidatos e te mostro o resultado bruto.

### Paths a testar (com `startDate=2026-05-01&endDate=2026-05-31&cnpjs[]=<CNPJ>`)
1. `/v2/bills/paid` — contas pagas
2. `/v2/bills/payable` — contas a pagar
3. `/v2/bills/paid/details` — detalhe linha-a-linha
4. `/v2/transactions` — lançamentos
5. `/v2/suppliers` — fornecedores cadastrados
6. `/widgets/cash-flow/v2/card/details?movimentType=D&groupBy=supplier`
7. `/v2/dre/dre-table-categories-details?groupIds[]=<pessoal_id>` — detalhe por categoria
8. `/v2/payroll` ou `/v2/folha` — folha (chute)
9. `/v2/cost-centers` — centros de custo (pode ter "Pessoa")

Cada um é testado tanto com CNPJ formatado quanto limpo, GET e (se 405) POST com body vazio.

## Critério de sucesso
Pelo menos um endpoint retorna 200 com array contendo `supplierName`/`fornecedor`/`partnerCpfCnpj` ou similar.

## Próximos passos pós-teste
- **Achou endpoint com CNPJ/fornecedor:** próxima task vira "construir matcher CNPJ↔pessoa usando esse endpoint". Apago a tela de mapeamento manual.
- **Nenhum endpoint útil:** voltamos pro plano A (tabela `personnel_salaries` no DB com tela de edição mensal).

## Arquivos alterados
- `supabase/functions/fetch-oxy-finance/index.ts` — adicionar case `probe`.

## Fora de escopo
- Nenhuma mudança de UI, hooks ou banco nesse passo.
- A action `probe` é só pra diagnóstico; depois que decidirmos o caminho, removo ou mantenho.
