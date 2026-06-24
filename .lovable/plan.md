## Comparação: planilha "PJs Ativos" × estado atual do sistema

A planilha enviada tem 49 PJs ativos com 4 campos-chave: **Nome (Pipefy)**, **CNPJ (Contrato)**, **Razão Social (Contrato)** e **Gestor**. Hoje o sistema tem:

- `cfo_squad_assignment` — 21 pessoas vinculadas a um squad de CFO (incompleto)
- `dre_supplier_alias` — vazio (nenhum alias manual cadastrado)
- Hook `useSquadCostFromDre` casa lançamentos DRE por CPF → CNPJ-raiz → alias → nome-exato → fuzzy-tokens

A planilha é a **fonte da verdade** que falta para resolver os ~R$ 47k "sem vínculo" e os squads com fallback.

### O que a planilha resolve

1. **Razão Social ↔ Pessoa** (o gap principal). Ex.: `"AURUM CONSULTORIA E SERVICOS LTDA"` no DRE = Gabriela Ramos Muniz. Hoje não casa por CPF/CNPJ-no-nome nem por tokens (nome da empresa ≠ nome da pessoa).
2. **CNPJ correto do contrato** quando difere do Pipefy (Lucas Ilha, Daniel Trindade, Eric Silveira, Sergio Piva, Tiago Pisoni — 5 divergências marcadas).
3. **Gestor → Squad CFO** para reorganizar `cfo_squad_assignment` (hoje provavelmente desatualizado vs. a coluna "Gestor (Pipefy match)" da planilha).

### Plano de implementação

**Etapa 1 — Importar como `dre_supplier_alias`** (resolve o grosso do unmatched)
- Script seed que insere 1 linha por PJ ativo:
  - `label_original` = Razão Social do contrato
  - `label_normalizado` = normalize(Razão Social)
  - `pessoa_nome` = Nome (Pipefy)
  - `pessoa_id` = ID Pipefy quando disponível (linhas 1–12)
- `upsert` por `label_normalizado` (não sobrescreve aliases já criados pelo admin).
- Pular 4 pessoas físicas sem CNPJ (estagiárias/CEO) — não aparecem no DRE com razão social distinta.

**Etapa 2 — Sincronizar `cfo_squad_assignment` com a coluna Gestor**
- Para cada PJ, garantir registro com `pessoa_nome` + `cfo_squad_nome = Gestor (Pipefy match)` + `role`:
  - role = `cfo` se Cargo = "CFO as a Service"
  - role = `analyst` para os demais
- Resolver o ramo "Pedro Ghiorzzi (CEO)": Gestor = "Desconhecido" → deixar sem squad (não aparece em squad de CFO).
- Não apagar registros existentes que não estão na planilha (preservar histórico); só atualizar o que muda.

**Etapa 3 — Diagnóstico de divergências CNPJ**
- Criar um aviso na aba `Admin → Squads CFOaaS` listando os 5 casos onde `pipefy_db_pessoas.CNPJ ≠ CNPJ do contrato` (Lucas, Daniel T., Eric, Sergio, Tiago P.), com botão "marcar como ciente" — não altera a tabela Pipefy automaticamente.

**Etapa 4 — Validar no CFO View**
- Após import, conferir: indicador "X pessoas mapeadas" deve subir de 4 para ~21, e "Fornecedor s/ vínculo" cair drasticamente. Squads de Tiago Pisoni (10 pessoas) e Eduardo Milani (4) devem mostrar custo real, não fallback.

### Arquivos

- **Novo:** `supabase/migrations/<timestamp>_seed_dre_supplier_alias_from_pjs.sql` — INSERTs idempotentes a partir da planilha (49 linhas hardcoded extraídas do .xlsx).
- **Novo:** `supabase/migrations/<timestamp>_sync_cfo_squad_assignment.sql` — UPSERTs de assignment usando Gestor da planilha.
- **Edit:** `src/components/planning/admin/CfoSquadAdminTab.tsx` — bloco de "Divergências CNPJ Pipefy × Contrato" (read-only, informativo).
- Sem mudanças no hook `useSquadCostFromDre` (a lógica de match já é suficiente; só faltava data).

### Pontos para confirmar antes de executar

1. Quero seguir com **todas as 3 etapas** (alias + squad + aviso de divergências) ou só a Etapa 1 (alias) primeiro pra você validar o impacto no CFO View?
2. Na Etapa 2, se um registro atual em `cfo_squad_assignment` tiver squad **diferente** do Gestor da planilha — sobrescrever ou criar uma linha extra? Planilha é a fonte da verdade ou histórico vale?