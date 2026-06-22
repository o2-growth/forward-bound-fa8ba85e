## Matching também por CPF (não só CNPJ)

### Causa raiz
Hoje o `useSquadCostFromDre` extrai só os **8 primeiros dígitos** do label do DRE e tenta casar contra `pipefy_db_pessoas.CNPJ`. Quem aparece na lista "sem CNPJ cadastrado" é, na maioria, **estagiário ou CLT** — pessoas que existem no Pessoas DB mas com **só CPF preenchido** (CNPJ vazio). E os lançamentos da folha/pró-labore vêm rotulados com **CPF** na label do DRE (ex.: `077.629.589 FRANK MAYKEL...`), não CNPJ.

Ou seja, a info já está toda no `pipefy_db_pessoas` — falta a gente olhar a coluna `CPF` também.

### O que muda

**`src/hooks/useSquadCostFromDre.ts`**
- Indexar `pipefy_db_pessoas` por **dois identificadores**: raiz de CNPJ (8 dígitos) **e** CPF completo (11 dígitos).
- Na hora de casar o fornecedor do DRE:
  1. Extrair os dígitos iniciais da label.
  2. Se tiver ≥11 dígitos contíguos, tentar **CPF (11 dígitos)** primeiro.
  3. Se não bater, tentar **CNPJ root (8 dígitos)**.
  4. Se nem CPF nem CNPJ baterem → `unmatched` (com qual identificador foi detectado).
- `UnmatchedSupplier` ganha `tipoIdDetectado: 'cpf' | 'cnpj' | null` (além do número já existente em `cnpjDetectado`, renomear para `idDetectado`).

**`src/components/planning/admin/CfoSquadAdminTab.tsx`**
- Tabela de "Fornecedores DRE sem vínculo" mostra coluna **"Identificador"** com badge `CPF` ou `CNPJ` + número.
- Renomear card para "Fornecedores DRE sem CPF/CNPJ cadastrado em Pessoas".
- A seção "Pessoas ativas (financeiro) sem CNPJ" passa a ser **"Pessoas ativas sem CPF e sem CNPJ"** (só lista quem realmente não tem nenhum dos dois — não dá pra vincular). Estagiário com CPF sai dessa lista.

### Resultado esperado
- Estagiários (Pedro Oppermann, Raissa, Felipe, Maria Eduarda, etc.) passam a ser vinculados por CPF.
- Lista de "sem CNPJ cadastrado" reduz drasticamente para o resíduo real: fornecedores PJ externos que não são pessoas (ex.: assinaturas SaaS, fornecedores de benefícios) ou pessoas que de fato faltam cadastro.

Sem migração de banco. Só hook + UI do admin tab.
