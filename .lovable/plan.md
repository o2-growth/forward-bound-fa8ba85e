## Objetivo

Cadastrar metas mensais absolutas por Closer (RM/RR/Prop/Venda) no admin e adicionar dois cards de **Rank** na aba "Indicadores Comercial" — um para SDRs e outro para Closers — mostrando Realizado, Meta e % de atingimento por indicador, com rateio proporcional pelos dias úteis filtrados.

## 1. Backend — Nova tabela `closer_absolute_metas`

Tabela global (sem split por BU), espelhando `sdr_metas`:

| Coluna | Tipo |
|---|---|
| closer | text |
| month | text |
| year | int (default 2026) |
| rm_meta | int (default 0) |
| rr_meta | int (default 0) |
| prop_meta | int (default 0) |
| venda_meta | int (default 0) |

- Unique key `(closer, month, year)`.
- RLS: leitura para autenticados, escrita só para admin (mesma política do `sdr_metas`).
- Seed inicial de Maio/2026:
  - Daniel Trindade — RM 119, RR 31, Prop 14, Venda 6
  - Amanda Serafim — RM 44, RR 23, Prop 10, Venda 5
  - Thiago — RM 44, RR 23, Prop 10, Venda 5

## 2. Frontend — Admin: aba "Metas Closer"

Novo hook `useCloserAbsoluteMetas` (CRUD por closer/mês/ano). Nova aba no admin (ao lado de "Metas SDR") com tabela editável: linhas = closers ativos (`CLOSERS` do `useCloserMetas.ts`), colunas = RM / RR / Prop / Venda. Seletor de mês/ano no topo.

> Observação: as metas % de rateio já existentes em `closer_metas` permanecem intocadas (continuam usadas para split de meta da BU). Esta nova tabela é independente e serve apenas ao rank por pessoa.

## 3. Frontend — Cards de Rank em `IndicatorsTab`

Dois novos `<Card>` abaixo do "Por Closer" já existente:

### Layout (mesmo para SDR e Closer)

Tabela ranqueada por % de atingimento médio dos 4 indicadores. Colunas:

```text
| # | Pessoa | RM (real/meta/%) | RR (real/meta/%) | Prop (real/meta/%) | Venda (real/meta/%) | % Médio |
```

- Badge de posição (1º, 2º, 3º destacados em cor).
- Barra de progresso fina por célula.
- Respeita filtros ativos de **data, BU, SDR, Closer**.

### Cálculo do Realizado

Reusa `itemsByIndicator` já filtrado em `IndicatorsTab`. Para cada pessoa (SDR ou Closer), conta itens por indicador (RM, RR, Proposta, Venda) onde a pessoa é responsável — usando a mesma lógica de atribuição já presente (`sdr` field para SDR, `responsible`/closer field para Closer).

### Cálculo da Meta com rateio por dias úteis

Função utilitária `prorateMeta(monthlyMeta, startDate, endDate)`:

1. Conta dias úteis (seg–sex) no mês de referência → `totalBusinessDays`.
2. Conta dias úteis no intervalo filtrado dentro daquele mês → `filteredBusinessDays`.
3. `metaRateada = monthlyMeta × (filteredBusinessDays / totalBusinessDays)`.
4. Quando o filtro cruza vários meses, soma o rateio mês a mês.

Aplicada às 4 metas (RM/RR/Prop/Venda) de cada pessoa.

- **SDR**: lê de `sdr_metas` (já existe). Hoje só tem `rm_meta` e `rr_meta` — Prop/Venda do rank de SDR ficam sem meta (mostra "—" em vez de %).
- **Closer**: lê da nova `closer_absolute_metas`.

### Ranking

Score = média dos % de atingimento dos indicadores que **têm meta > 0**. Empates desempata por Vendas realizadas.

## 4. Arquivos

**Novos**
- `supabase/migrations/...closer_absolute_metas.sql`
- `src/hooks/useCloserAbsoluteMetas.ts`
- `src/components/admin/CloserAbsoluteMetasTab.tsx`
- `src/components/planning/indicators/PersonRanking.tsx` (componente compartilhado SDR/Closer)
- `src/lib/businessDayProrate.ts` (utilitário rateio)

**Editados**
- `src/components/admin/AdminPanel.tsx` (ou equivalente) — adicionar nova aba "Metas Closer".
- `src/components/planning/IndicatorsTab.tsx` — montar dois cards de rank consumindo `PersonRanking` com `role="sdr"` e `role="closer"`.

## 5. Fora de escopo

- Não altera `closer_metas` (% rateio por BU continua igual).
- Não altera os cards "Por SDR" e "Por Closer" já existentes (breakdown por período/semana).
- Sem gráficos extras; só tabela ranqueada.