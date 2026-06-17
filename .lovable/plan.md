## Objetivo
Substituir o match heurístico por **vínculo direto entre lançamento financeiro (Oxy) e funcionário (pipefy_db_pessoas)** via nome/CNPJ, gerando "Lançamentos sem match" pra revisão manual.

## Descobertas que mudam o plano original

- `cashflow_details` da Oxy retorna `{ label, type: "customer"|"supplier", data:[{period,value}] }` — **só nome, sem CNPJ no payload**. Match será por nome normalizado.
- `pipefy_db_pessoas` tem CNPJ formatado (`XX.XXX.XXX/XXXX-XX`), CPF, Nome e Título.
- `movimentType=D` retornou vazio no teste — precisa ajustar formato de CNPJ na request (tentar `CNPJ_CLEAN` em vez de `CNPJ_FORMATTED`, e/ou tentar sem `isLate`).

## Implementação

### 1. Edge Function `fetch-oxy-finance`
- Ajustar `cashflow_details`: tentar primeiro com `CNPJ_CLEAN`; se voltar vazio, fallback pra `CNPJ_FORMATTED`. Logar o que funcionou.
- Aceitar `movimentType` "D" sem exigir `isLate` (deixar opcional, sem default `false`).

### 2. Hook novo: `src/hooks/usePersonnelCostByPerson.ts`
- Chama `fetch-oxy-finance` com `action: 'cashflow_details', movimentType: 'D'` pro range selecionado.
- Carrega `pipefy_db_pessoas` (via `query-external-db` action `pessoas_all` já existente).
- Constrói índice de pessoas por **nome normalizado** (trim + lowercase + sem acento, também removendo sufixos comuns: "ltda", "me", "eireli", "consultoria", "servicos"). Indexa tanto `Nome` quanto `Título`.
- Pra cada `label` (fornecedor) do cashflow_details:
  - Normaliza o label.
  - Tenta match exato. Se não, tenta **match por token** (todos os tokens do nome da pessoa presentes no label, mínimo 2 tokens significativos pra evitar falso positivo).
- Retorna:
  - `lancamentosComMatch: Array<{ pessoaId, pessoaNome, pessoaTime, fornecedorLabel, valor }>` — soma do período.
  - `lancamentosSemMatch: Array<{ fornecedorLabel, valor }>` ordenado desc.
  - `custoTotalComMatch`, `custoTotalSemMatch`, `custoTotalGeral`.
  - `custoPorPessoa`, `custoPorTime` (agregações).
  - `isLoading`, `error`.

### 3. UI — `PessoasTab.tsx` (seção 3.2 reescrita)
Substituir os cards atuais por:
- **4 KPIs:**
  - Custo de pessoal (com match) — soma dos lançamentos vinculados a funcionário.
  - Custo / Receita — `custoComMatch ÷ receitaPeriodo`.
  - Custo per capita — `custoComMatch ÷ headcountMédio`.
  - Lançamentos sem match — total R$ + contagem (badge amarelo se > 10% do total).
- **Tabela "Custo por pessoa"** (top 20): Nome · Time · Cargo · R$ no período · % do total.
- **Tabela "Custo por time"**: agrega por `Time` da pipefy.
- **Bloco colapsável "Lançamentos sem match"** (com badge laranja): lista fornecedor + valor, pra você ver se é despesa não-pessoal ou se faltou cadastro/grafia divergente.

A heurística antiga por bucket (Folha/Encargos/etc) some — você escolheu "Listar separado pra revisão", então tudo que não casar com pessoa cai no bloco de não-match.

### 4. Sem mexer
- Schema do banco, RLS, outras tabs, outras edge functions.

## Risco / próximos passos
- Se `cashflow_details` continuar vazio pra `D` mesmo com `CNPJ_CLEAN`, vou logar o erro e te avisar pra a gente testar outro endpoint da Oxy (provavelmente `/v2/dre/dre-table-categories` por grupo de Pessoal).
- Match por nome pode errar em casos como "Maria Silva ME" vs "Maria Silva Consultoria" — a lista de "sem match" + a tabela "com match" te deixam auditar e a gente refina.
