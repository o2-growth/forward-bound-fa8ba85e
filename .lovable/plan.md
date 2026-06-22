## Diagnóstico

Olhando a resposta real da API DRE Oxy (categoria `Equipe CaaS`, mai/26), o label do fornecedor **não vem com CNPJ** na maioria dos casos — vem com a **razão social da PJ** do colaborador. Exemplos:

| Label DRE | Pessoa real (no Pessoas DB) |
|---|---|
| `TAINARA SOFIA KONZEN ANALISE E PLANEJAMENTO LTDA` | Tainara Sofia Konzen |
| `DOUGLAS PINHEIRO SCHOSSLER LTDA` | Douglas Pinheiro Schossler |
| `COCHLAR SERVICOS DE APOIO ADMINISTRATIVO LTDA` | Gustavo Ferreira Cochlar |
| `MENDES INTELIGENCIA FINANCEIRA` | Anderson Felizardo Mendes |
| `JOSY SARTORI GESTAO FINANCEIRA E ADMINISTRATIVA` | Joseane Lima da Silva Sartori |
| `EB CONSULTORIA FINANCEIRA` | ??? (precisa decisão humana) |

A API só retorna `label` e `type:"supplier"`. Não tem campo de CNPJ no payload. O Pessoas DB do Pipefy também não tem coluna "Razão social" — só Nome, CPF, CNPJ. Então não dá pra automatizar 100% sem inferência.

Você já vetou matching fuzzy por nome (e está correto — `BORAFAZERCONSULTORIALTDA` e `MLS SOLUCOES` etc. seriam chutes ruins).

## Solução: alias manual (1x por fornecedor, persistido)

Nova tabela `dre_supplier_alias` com `label_normalizado UNIQUE → pessoa_id + pessoa_nome`. Admin vincula cada fornecedor uma única vez, e a partir daí o matching é determinístico para sempre.

### 1. Migração
```sql
CREATE TABLE public.dre_supplier_alias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_normalizado text UNIQUE NOT NULL,
  label_original text NOT NULL,
  pessoa_id text,                -- ID Pipefy da pessoa
  pessoa_nome text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- GRANTs + RLS (read authenticated, write admin)
```

### 2. `useSquadCostFromDre.ts`
Ordem de matching:
1. CPF (11 dígitos no início do label)
2. CNPJ root (8 dígitos no início do label)
3. **Alias manual** (`normalize(label)` ↔ `dre_supplier_alias.label_normalizado`)
4. Senão → `unmatched`

### 3. `CfoSquadAdminTab.tsx` — painel unmatched
Cada linha ganha um **dropdown "Vincular a pessoa…"** (lista de pessoas ativas do Pessoas DB com cargo financeiro). Ao escolher e clicar "Salvar":
- Insere em `dre_supplier_alias` (`label_normalizado` = normalize(label), `pessoa_nome` = pessoa escolhida).
- Linha some no próximo render; o custo passa a entrar no squad da pessoa.

Bloco extra: tabela **"Aliases configurados"** listando todos os vínculos manuais com botão de remover (caso erro).

### 4. Resultado
- Estagiários/CLT → já resolvidos por CPF (mudança anterior).
- PJs com CNPJ no label → resolvidos por CNPJ.
- PJs só com razão social no label → admin vincula 1x, persiste pra sempre.
- 100% determinístico, sem fuzzy.

### Arquivos
- migração nova
- `src/hooks/useSquadCostFromDre.ts` (load alias + ordem de matching)
- `src/components/planning/admin/CfoSquadAdminTab.tsx` (dropdown + tabela aliases)
