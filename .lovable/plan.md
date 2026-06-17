## Por que está zerado
A Oxy `cashflow_details?movimentType=D` retorna `data: []` (testei nos dois formatos de CNPJ). Esse endpoint não tem os lançamentos de despesa por fornecedor. Vamos pelo caminho que você escolheu: **`dre-table-categories`** com o(s) groupId(s) de Pessoal.

## Implementação

### 1. Listar grupos do DRE pra achar o(s) "Pessoal"
- Já temos `dre` que retorna todos os grupos com `code`, `label` e `id` (uuid).
- Filtrar no client os grupos cujo label normalizado bata em padrões de pessoal: `pessoal`, `pessoa`, `folha`, `rh`, `colaborador`, `equipe`. Pegar o `id` (uuid) deles → array `personnelGroupIds`.
- Mostrar no UI quais grupos foram pegos (auditoria + ajuste fino).

### 2. Buscar categorias desses grupos
- Reusar `action: 'dre_categories'` que já existe no edge function — chamar com `groupIds: personnelGroupIds` e o range do filtro.
- Resposta vem como `{ categories: [{ label, data: [{period, value}] }] }`. **Cada categoria é um lançamento agregado** — o label muitas vezes é o nome da pessoa/fornecedor (ex: "DOUGLAS PINHEIRO SCHOSSLER" ou "53.385.723/0001-12 - Douglas...").

### 3. Match com `pipefy_db_pessoas`
- Reaproveitar a lógica de match por nome normalizado + tokens que está no `usePersonnelCostByPerson`.
- Adicionar match por **CNPJ**: se a string da categoria contiver o CNPJ formatado ou só dígitos, comparar com `pessoa.CNPJ`. (Útil porque a Oxy frequentemente coloca CNPJ no label.)
- Saída: `lancamentosComMatch`, `lancamentosSemMatch`, `custoPorPessoa`, `custoPorTime` — mesma forma que já tem.

### 4. Refatorar `usePersonnelCostByPerson`
- Trocar `fetchCashflowDetails` (que retorna vazio) por uma nova `fetchPersonnelCategories`:
  - 1ª query: `useOxyFinance(year).dreRaw` → derivar `personnelGroupIds`.
  - 2ª query: `supabase.functions.invoke('fetch-oxy-finance', { body: { action: 'dre_categories', groupIds: personnelGroupIds, startDate, endDate } })`.
- Manter o mesmo shape de retorno → **zero mudança na UI do 3.2**.

### 5. Auditoria visual no 3.2
- Adicionar uma linha pequena acima dos KPIs: "Grupos DRE de Pessoal incluídos: Folha Modelo Atual · Pessoal Tax · …" (chips). Se a heurística pegar algo errado, dá pra ver na hora.

### Não vou mexer
- Schema, RLS, outras tabs.
- O warning "Maximum update depth" em `PlanGrowthDataLoader`/`MediaMetasContext` (não tem relação com Pessoas — pré-existente).

## Risco
- Se o label da categoria for genérico (ex: "Salários CLT") sem nome da pessoa, vai cair em "sem match" e a gente decide se soma como custo de equipe (rateio) ou ignora. Vou listar tudo separado pra você ver primeiro.
