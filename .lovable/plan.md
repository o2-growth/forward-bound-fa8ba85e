## Custo real por CFO/analista — via CNPJ da Pessoas DB + drill-down do DRE Oxy

### Como funciona

**Sem rateio. Sem hardcode de valores.** O vínculo é todo automático via CNPJ:

1. **Pessoas DB (Pipefy)** já tem CNPJ de cada colaborador (CFOs e analistas).
2. **API do DRE Oxy** (`dre_drill_down`) devolve, em cada categoria de pessoal CaaS, a lista de fornecedores com o **CNPJ embutido no label** (ex: `"50.512.959 HUMBERTO DE AZEVEDO BEHS"`) ou só a razão social (ex: `"EB CONSULTORIA FINANCEIRA"`).
3. Pareamos pelos **8 primeiros dígitos do CNPJ** (raiz da empresa). Fallback por nome normalizado quando o label só tem razão social.

A única coisa que NÃO está nas APIs é **qual analista pertence a qual squad de CFO** — isso precisa de uma tabela pequena de configuração editável pelo admin.

### Implementação

1. **Tabela `cfo_squad_assignment`** (migração)
   - Colunas: `pessoa_id` (string, FK lógica do Pipefy), `pessoa_nome`, `cfo_squad_nome` (nome do CFO que lidera o squad), `role` (`cfo` ou `analyst`), timestamps.
   - RLS: leitura `authenticated`, escrita `admin`.
   - Seed inicial com os 8 squads atuais (Oliveira, Schossler, Pedrolo, Bisinella, Cochlar, D'Agostini, Mariana Luz, Marchioretto) e seus analistas — uso os nomes já no `CFO_SQUADS` para popular.

2. **Hook `useSquadCostFromDre`** (`src/hooks/useSquadCostFromDre.ts`)
   - Carrega: (a) Pessoas DB via `useHrData`, (b) `cfo_squad_assignment`, (c) drill-down de cada categoria CaaS de pessoal (`Equipe CaaS`, `Benefícios CaaS`, `Pró-labore CaaS`, etc.) no range selecionado.
   - Para cada supplier do drill-down:
     - Extrai dígitos do label → raiz CNPJ → busca pessoa com mesma raiz.
     - Se não bater, fallback: normaliza nome do supplier vs `Nome`/`Título` da pessoa.
     - Soma o valor na pessoa encontrada, separando `fee` (categorias Equipe/Pró-labore/Salário) e `benef` (Benefícios/Alimentação/Deslocamento/Seguro de vida).
   - Agrupa por `cfo_squad_nome` usando `cfo_squad_assignment`.
   - Devolve: `porSquad[{ cfoNome, fee, benef, total, membros[{ nome, cnpj, fee, benef, suppliersMatched }] }]`, `unmatched[{ supplierLabel, valor }]`, `isLoading`, `error`.

3. **Aba admin "Squads CFOaaS"** (`src/components/planning/admin/CfoSquadAdminTab.tsx`)
   - Lista pessoas com Cargo CFO/Analista FP&A da Pessoas DB.
   - Dropdown pra atribuir cada uma a um squad (1 CFO por squad, N analistas).
   - Painel "Não vinculados no DRE" mostra suppliers do mês corrente que não bateram CNPJ — botão pra criar/corrigir vínculo.

4. **`CfoView.tsx`** (Operação → CFOs)
   - Substitui `getSquadCusto`/`getSquadBeneficios` pelo hook. Mantém estrutura visual.
   - Cards/tabela passam a usar valores reais do mês.
   - Banner com badge quando há "não vinculados" pra forçar correção.

### Garantia 100%
- Total CaaS de pessoal do DRE = soma de todos os squads + lista "não vinculados". Cada centavo rastreável.
- Quando entra analista novo: aparece em "não vinculados" → admin atribui squad uma vez → fluxo automático dali em diante.
- CNPJ é a chave primária do match — zero ambiguidade.

### Arquivos
- 🆕 Migração: `cfo_squad_assignment` + RLS + GRANTs + seed.
- 🆕 `src/hooks/useSquadCostFromDre.ts`.
- 🆕 `src/components/planning/admin/CfoSquadAdminTab.tsx` + registro na AdminTab.
- ✏️ `src/components/planning/jornada/CfoView.tsx` — consome o hook; remove valores hardcoded de `CFO_SQUADS`.

### Confirmar antes de codar
- **Benefícios** (Vale-refeição, Plano de saúde, Caju, etc.) no DRE Oxy aparecem como supplier "Bradesco Saúde", "Swile" — não dá pra bater por CNPJ por pessoa. Quer que eu **rateie benefícios por headcount do squad**, ou ignore benefícios por enquanto e mostre só `Equipe CaaS` (fees)?
