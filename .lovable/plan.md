# Plano: Custo de Pessoal por Categoria + Time (com Oxy DRE)

Como a Oxy só expõe DRE consolidada e categorias agregadas (sem fornecedor/CNPJ), pivotamos o painel atual: ao invés de "categoria → 1 pessoa" (impossível), passa a ser "categoria → split entre Times %" + composição por natureza. Custo individual fica como média estimada.

## Entregas (aba Pessoas → 3.2 Custo de pessoal)

### Card 1 — Composição do custo de pessoal
Donut/stacked bar consumindo `dre_categories` do grupo "Despesas com Pessoal":
- Salários CLT, Pró-labore, FGTS, INSS, Benefícios (VR/VA/saúde), Rescisões, PLR/Bônus, Treinamentos, Outros.
- Mostra valor absoluto e % do total.
- Filtro de período herdado da página.

### Card 2 — Custo por Time
Bar chart horizontal com R$ por Time (Comercial, Marketing, Tech, Ops, …) baseado no rateio configurado.
- Cada Time mostra: total R$, headcount ativo no mês, custo médio/pessoa.
- Click no Time → drawer com breakdown por categoria DRE.

### Card 3 — Custo médio por pessoa (por Time)
Tabela: Time | Headcount ativo (Pipefy DB Pessoas) | Custo total | Custo médio/pessoa.
- Banner explicativo: "Média por Time — a Oxy não expõe fornecedor por lançamento, então usamos rateio configurado dividido pelo headcount ativo do mês".

### Painel de mapeamento (reformulado)
Substitui o painel atual `DreMappingPanel`. Para cada categoria DRE pendente:
- Listar todos os Times ativos (vindos de `pipefy_db_pessoas` distinct).
- Inputs de % para cada Time, com validação de soma = 100%.
- Botão **"Sugerir por headcount"**: preenche % proporcional ao número de pessoas ativas em cada Time.
- Botão **"Copiar de outra categoria"**: ex: encargos costumam seguir o split de Salários CLT.
- Tabs: Pendentes / Mapeadas / Ignoradas (como hoje).

## Banco

Reaproveitar `personnel_dre_mapping`:
- Adicionar coluna `team_split JSONB` formato `{ "Comercial": 35, "Marketing": 20, "Tech": 30, "Ops": 15 }`.
- Manter `person_id` nullable (para futuro, se a Oxy expor por pessoa).
- Tornar a chave única `(category_id, period)` ao invés de `(category_id, person_id)`.

Migration adiciona coluna + drop da unique antiga + nova unique.

## Arquivos

- `supabase/migrations/*` — alterar `personnel_dre_mapping`
- `src/hooks/usePersonnelDreMapping.ts` — adaptar para `team_split`
- `src/hooks/usePersonnelCostByTeam.ts` (novo) — calcula custo por Time aplicando rateio sobre categorias
- `src/components/planning/DreMappingPanel.tsx` — reformular UI (% por Time, sugestões)
- `src/components/planning/CustoComposicaoCard.tsx` (novo) — donut de composição
- `src/components/planning/CustoPorTimeCard.tsx` (novo) — bar chart + drawer
- `src/components/planning/CustoMedioPessoaCard.tsx` (novo) — tabela média
- `src/components/planning/PessoasTab.tsx` — substituir os 2 cards vazios pelos 3 novos
- `src/hooks/usePersonnelCostByPerson.ts` — **remover** (não é viável)

## Fora de escopo
- Custo real individual por pessoa (não viável com a API atual).
- Tabela `personnel_salaries`, importador CSV (descartados).
- Endpoint `cashflow_details` para despesas (retorna vazio).

## Saída esperada
Você vê: "Maio/26 custou R$ 540k de pessoal → 60% CLT, 18% encargos, 15% benefícios, 7% outros. Por Time: Comercial R$ 190k (8 pessoas, média R$ 23k), Tech R$ 162k (10 pessoas, R$ 16k), …". Sem precisar de mais nenhuma fonte de dado nova.
