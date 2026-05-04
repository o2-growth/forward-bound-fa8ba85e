## MRR Base do Plan Growth puxando da Oxy (Modelo Atual)

### Regra final do MRR (validada com retorno real da Oxy)

**MRR = soma de TODAS as categorias de CaaS + SaaS, EXCETO `Setup` e `Serviços Especializados`.**

Categorias incluídas (case-insensitive, normalizando acentos):

**CaaS (group `bed1718d-e54f-4341-abe0-22ae7f04a26a`):**
- Enterprise ✅
- Corporate ✅
- BPO Financeiro ✅
- Parceiros ✅
- Serviços Especializados ❌ (excluído)

**SaaS (group `6c3f10e6-2d2d-48d5-81ef-18bb6389b159`):**
- Oxy ✅
- Oxy + Gênio ✅
- Oxy + Gênio + Especialista ✅
- Parceiros ✅
- Setup ❌ (excluído)

Validação Jan–Abr/2026 (R$):
| Mês | CaaS-MRR | SaaS-MRR | **Total MRR** |
|---|---:|---:|---:|
| Jan | 644.693 | 60.575 | **705.268** |
| Fev | 691.466 | 55.881 | **747.347** |
| Mar | 687.169 | 46.112 | **733.281** |
| Abr | 661.582 | 38.570 | **700.152** |

### Escopo
- **Apenas Modelo Atual** (CaaS+SaaS pertencem a essa BU).
- **Sobrescreve apenas Jan–Abr/2026** (meses fechados). Maio em diante segue projetado via churn 6% / retenção 25%, partindo do MRR real de Abril.
- **Override manual** (`is_total_override = true`) sempre prevalece — sync pula essas linhas.

---

### Implementação

**1. Edge function nova `supabase/functions/sync-mrr-base/index.ts`**
- Input: `{ year: number, months?: string[] }` (default = Jan–Abr/2026, ou só meses fechados).
- Faz 2 chamadas internas a `fetch-oxy-finance` action `dre_categories` (uma com groupId CaaS, outra SaaS) cobrindo o range solicitado.
- Para cada mês, soma `value` de todas as categorias **exceto** as cujo `label` normalizado seja `setup` ou `servicos especializados`.
- Lê `mrr_base_monthly` antes do upsert, **pula meses com `is_total_override = true`**.
- Upsert em `mrr_base_monthly` com `is_total_override = false` e `updated_at = now()`.
- Retorna `{ synced: [...], skippedOverride: [...], total }`.
- JWT obrigatório (admin role).

**2. Hook `src/hooks/useMrrBase.ts`**
- Adicionar `syncFromOxy(year)` mutation que invoca a edge function e invalida cache `mrr-base-monthly`.

**3. UI `src/components/planning/MediaInvestmentTab.tsx`**

a) **Hidratar projeção (linhas 1247–1257)**: novo `useMemo mrrRealizadoPorMes` lendo `useMrrBase` e filtrando Jan–Abr/2026.

b) **Refatorar `calculateMrrAndRevenueToSell` (linhas 138–181)**: aceitar 7º parâmetro `mrrRealizadoPorMes?: Record<string, number>`. No loop:
- Se mês tem valor real → `mrrAtual = mrrRealizadoPorMes[month]` (ignora churn/retenção daquele mês).
- Senão → fórmula atual.

c) **Coluna "MRR Base" (linha 541)** ganha badge de origem por linha:
- 🔄 Oxy (sync) | ✏️ Manual (override) | 📈 Projetado
- Tooltip com `updated_at` do último sync.

d) **Botão "Sincronizar com Oxy"** acima da tabela do Modelo Atual:
- Chama `syncFromOxy(2026)`.
- Toast: "X meses sincronizados, Y mantidos (override manual)".
- Loading state com spinner.

e) **Inputs manuais (linhas 1803–1830)**:
- **MRR Inicial** vira read-only mostrando MRR Jan/Oxy (com botão "Editar" para override).
- **Valor A Vender Inicial (Jan)** = `Meta Jan − MRR Base Jan (Oxy)`, ainda editável.
- Sliders churn/retenção continuam afetando só Mai–Dez.

---

### Não muda
- Outras BUs (O2 TAX, Oxy Hacker, Franquia).
- Funil reverso vendas → propostas → leads.
- Sistema de batch save / pendingChanges / redistribuição.
- Aba Admin > Metas Monetárias (recebe o mesmo botão de sync).

---

### Memória a salvar
Atualizar `mem://logic/plan-growth/mrr-projection-source-logic` com a regra: "Para Modelo Atual, MRR Base de meses fechados vem de Oxy DRE (CaaS+SaaS, exceto Setup e Serviços Especializados). Override manual via is_total_override prevalece."