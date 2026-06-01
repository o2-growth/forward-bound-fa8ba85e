## Objetivo
Tornar os drawers da sub-aba **Typeform** muito mais informativos: ao clicar num KPI, SDR, dia, faixa de faturamento, setor, UF, source, caminho ou janela temporal, abrir um drawer com **duas abas**:
1. **Resumo** — KPIs + breakdowns cruzados do recorte clicado.
2. **Leads** — lista individual dos leads daquele recorte, com busca e export CSV.

Fonte nova: `v_o2_diag_leads_full` (1 linha por lead, deduplicada por email, já liberada para anon).

---

## 1. Camada de dados

**`src/components/planning/typeform/useTypeformData.ts`**
- Adicionar interface `DiagLeadFull` com todas as colunas da view (response_id, nome, email, telefone, empresa, cargo, setor, faturamento, uf, erp, caminho, is_mql, completo, agendado, sdr_nome, source, medium, campaign, booking_date, created_at, updated_at, completed_at, etc.).
- Adicionar hook `useDiagLeadsFull()` que busca `v_o2_diag_leads_full?select=*` uma única vez (staleTime 5min). A filtragem por recorte é feita no cliente — a view não é grande.

---

## 2. Drawer com abas

**`src/components/planning/typeform/TypeformDetailDrawer.tsx`** (refatorar)
- Aumentar largura para `sm:max-w-2xl`.
- Adicionar `Tabs` ("Resumo" / "Leads (N)") usando shadcn.
- Nova prop:
  ```ts
  interface Props {
    open, onOpenChange, title, description,
    fields: DetailField[],          // Resumo (já existe)
    breakdowns?: BreakdownBlock[],  // novo: blocos cruzados no Resumo
    leads?: DiagLeadFull[],         // novo: leads filtrados
    leadsLoading?: boolean,
  }
  interface BreakdownBlock { title: string; rows: { label: string; value: string }[] }
  ```
- **Aba Resumo**: grid de KPIs (`fields`) + lista compacta de blocos `breakdowns` (ex.: "Por faturamento", "Por setor", "Por SDR") com top 5 cada.
- **Aba Leads**:
  - Input de busca (filtra por nome/email/empresa, case-insensitive + sem acento).
  - Tabela compacta com colunas: Nome · Empresa · Faturamento · Setor · SDR · Status (badges Compl/Ag/MQL) · Data.
  - Botão "Exportar CSV" — gera CSV no cliente com todas as colunas da view.
  - Linha clicável abre um popover/dialog com **todas** as colunas da view daquele lead.

---

## 3. Filtragem por recorte (no `TypeformDashboard.tsx`)

Para cada handler de clique, calcular:
- `leadsFiltrados = allLeads.filter(<predicado do recorte>)`
- `breakdowns` cruzados relevantes ao recorte

| Clique em | Predicado | Breakdowns cruzados |
|---|---|---|
| KPI Leads/MQLs/Agendados/Conv | (todos) ou `is_mql` / `agendado` | Por SDR, Por faturamento, Por setor |
| SDR (barra) | `sdr_nome === row.sdr_nome` | Por faturamento, Por setor, Por caminho |
| Dia (barra pipeline) | `booking_date === row.booking_date` | Por SDR, Por faturamento |
| Faixa faturamento | `faturamento === row.faturamento` | Por SDR, Por setor, Por UF |
| Setor | `setor === row.setor` | Por SDR, Por faturamento, Por UF |
| Caminho | `caminho === row.caminho` | Por SDR, Por faturamento |
| UF | `uf === row.uf` | Por SDR, Por setor |
| Source | `source === row.source` | Por caminho, Por faturamento |
| Janela temporal | `created_at` na janela (hoje / 7d / 30d / mais antigo) | Por SDR, Por faturamento, Por setor |

Helper `buildBreakdown(leads, key, topN=5)` que agrupa, conta MQLs/Agendados e ordena.

Comparações de string normalizadas (trim + lowercase + NFD sem acento) — regra global do projeto.

---

## 4. Detalhes técnicos

- **Sem alterar APIs/views existentes** — apenas adicionar consumo de `v_o2_diag_leads_full`.
- **Performance**: 1 fetch único da view, filtragem em memória; React Query cacheia.
- **Empty state**: "Nenhum lead neste recorte" quando filtro retorna 0.
- **CSV**: nome do arquivo `typeform-leads-{recorte}-{YYYYMMDD}.csv`, separador `;`, encoding UTF-8 com BOM (para Excel BR).
- **Acessibilidade**: linhas da tabela com `role="button"` e `tabIndex={0}`.

---

## Arquivos afetados

- `src/components/planning/typeform/useTypeformData.ts` — +interface +hook
- `src/components/planning/typeform/TypeformDetailDrawer.tsx` — refatorar para 2 abas + breakdowns + tabela leads + export
- `src/components/planning/typeform/TypeformDashboard.tsx` — passar `leads` + `breakdowns` filtrados em cada `openDrawer(...)`
- (novo) `src/components/planning/typeform/leadsFilters.ts` — helpers `buildBreakdown`, `normalize`, `inWindow`, `exportCsv`

Nenhuma mudança em backend/edge functions.