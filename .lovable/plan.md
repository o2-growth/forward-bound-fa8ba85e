# Plano: Mapeamento manual Categoria DRE → Pessoa

## Objetivo
Permitir vincular cada categoria/lançamento de Pessoal vinda do Oxy (via `dre-table-categories`) a uma pessoa do `pipefy_db_pessoas`, salvando o vínculo para reuso automático nos próximos meses.

## 1. Banco — nova tabela `personnel_dre_mapping`
Migration cria:
- `id` uuid pk
- `dre_label` text (normalizado: trim + lowercase + sem acento) — chave de match
- `dre_label_original` text (para exibição)
- `group_id` text (id do grupo DRE de origem, opcional)
- `pessoa_id` text (id no `pipefy_db_pessoas`) — nullable = "ignorar"
- `pessoa_nome` text (snapshot para display)
- `time` text (snapshot)
- `tipo` text enum livre: `salario | beneficio | encargo | rescisao | pro_labore | outro` (default `outro`) — útil para totalizadores
- `is_ignored` boolean default false (lançamento não-pessoal, ex: software de RH)
- `created_at`, `updated_at`, `created_by` uuid

Índice único em `(dre_label)`.
RLS: leitura/escrita só para `authenticated` com role `admin` ou `user` autorizado.
GRANTs padrão + service_role.

## 2. Hook `usePersonnelDreMapping`
- Carrega todos mapeamentos.
- Expõe: `getMappingFor(label)`, `upsertMapping(...)`, `removeMapping(label)`, `bulkAutoSuggest(labels, pessoas)` (sugestão por similaridade de nome — só sugere, não salva).

## 3. Refactor de `usePersonnelCostFromDRE`
Após buscar as categorias, junta com mapeamento:
- Para cada categoria, procura match exato pelo `dre_label` normalizado.
- Retorna 3 buckets:
  - `mapeadas` (com pessoa)
  - `ignoradas`
  - `pendentes` (sem mapping) — destaque na UI
- Soma `custoPorPessoa` e `custoPorTime` usando só `mapeadas`.

## 4. UI — nova seção em `PessoasTab.tsx`
**Bloco "Mapeamento de Categorias DRE"** (collapsible, abre se houver pendentes):

```text
[Pendentes: 12]  [Mapeadas: 47]  [Ignoradas: 5]      [Auto-sugerir]

┌─ Pendentes ──────────────────────────────────────────────┐
│ Categoria DRE          Valor médio    Pessoa     Tipo  ⏷ │
│ SALARIO DOUGLAS PI...  R$ 12.300      [Buscar▾] [Sal▾] ✓ │
│ FGTS MARIANA           R$    980      [Buscar▾] [Enc▾] ✓ │
│ ZENKLUB                R$  1.450      [Ignorar]          │
└──────────────────────────────────────────────────────────┘
```

- Dropdown de pessoas: combobox com busca por nome (usa `pipefy_db_pessoas` já carregado).
- Botão **Auto-sugerir**: roda matcher de tokens (nome normalizado contido na label) e pré-preenche os dropdowns com sugestão (badge "sugestão" — usuário confirma com ✓).
- Salvar é por linha (debounce 500ms) — feedback toast.
- Aba secundária "Mapeadas" permite editar/remover vínculos antigos.

## 5. KPIs e gráficos
- KPI "Custo total" passa a ter sub-linha: `R$ X mapeado · R$ Y pendente`.
- Card de aviso só aparece se `pendentes > 0`.
- Gráfico "Custo por categoria DRE" ganha cor diferente para pendentes.

## Arquivos
- `supabase/migrations/*` — nova tabela + RLS + grants
- `src/hooks/usePersonnelDreMapping.ts` (novo)
- `src/hooks/usePersonnelCostFromDRE.ts` (editar — juntar com mapping)
- `src/components/planning/PessoasTab.tsx` (editar — nova seção)
- `src/components/planning/DreMappingTable.tsx` (novo)

## Fora de escopo
- Importação CSV em massa (pode virar v2 se quiser depois).
- Match por CNPJ (Oxy não expõe CNPJ por categoria nesse endpoint — só nome na label).
