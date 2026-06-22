## Ajuste: vínculo de fornecedores DRE estritamente via Pessoas (Pipefy)

### Problema
O hook atual (`useSquadCostFromDre.ts`) tenta vincular fornecedor → pessoa em duas etapas:
1. CNPJ (raiz 8 dígitos) contra `pipefy_db_pessoas`
2. **Fallback por nome normalizado** (tokens em comum)

Esse fallback por nome é frágil (homônimos, nomes truncados, "EB CONSULTORIA" etc.) e não é o que você quer. A fonte de verdade do CNPJ de cada colaborador é o **database de Pessoas do Pipefy**.

### O que muda

**1. `useSquadCostFromDre.ts`**
- Remover o bloco de fallback por nome (linhas ~189–201).
- Vínculo passa a ser **exclusivo por CNPJ** (raiz 8 dígitos) cruzando com `pipefy_db_pessoas.CNPJ`.
- Se o fornecedor do DRE não tem CNPJ na label OU se o CNPJ não bate com nenhuma pessoa → vai direto para `unmatched`.
- Não inventar pessoa, não casar por nome.

**2. `CfoSquadAdminTab.tsx` — painel "Não vinculados no DRE"**
- Renomear para algo como **"Fornecedores DRE sem CNPJ cadastrado em Pessoas"**.
- Para cada fornecedor não vinculado, extrair o CNPJ da label (quando houver) e mostrar:
  - Label original do DRE
  - CNPJ detectado (raiz 8 dígitos)
  - Valor no período
  - Categoria DRE
  - Mensagem clara: **"Cadastre o CNPJ deste fornecedor no card da pessoa correspondente no Pipefy (Database de Pessoas) para vincular automaticamente."**
- Não oferecer mais botão de "vincular manualmente" por nome — a correção é feita no Pipefy, não no app.

**3. Pessoas sem CNPJ**
- Adicionar uma seção secundária listando pessoas do Pessoas DB **sem CNPJ preenchido** (potenciais causas de unmatched), com link/ID do card no Pipefy. Ajuda o admin a saber onde agir.

### Comportamento resultante
- Total CaaS do DRE = `Σ squads + Σ unmatched`.
- Unmatched só zera quando o CNPJ do fornecedor é cadastrado no card da pessoa no Pipefy. Próxima sincronização do `pipefy_db_pessoas` resolve automaticamente.
- Nada de matching fuzzy: 100% determinístico por CNPJ.

### Arquivos tocados
- `src/hooks/useSquadCostFromDre.ts` (remover fallback de nome; ajustar tipo de `unmatched` para incluir `cnpjDetectado`)
- `src/components/planning/admin/CfoSquadAdminTab.tsx` (painel de unmatched + lista de pessoas sem CNPJ)
- `src/components/planning/jornada/CfoView.tsx` (apenas texto do banner, se necessário)

Sem migração de banco. Sem mudança no `CfoView` além de copy.
