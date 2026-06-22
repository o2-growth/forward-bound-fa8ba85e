## O que muda

Na tabela **"Visão Total — Indicadores 26"** (aba Marketing):

- **2026** → todas as células vêm dos hooks ao vivo (`useIndicators26Live`). A planilha não é mais consultada para 2026.
- **2025** → continua vindo da planilha (`useIndicators26Raw`) como fonte da verdade.
- A grade de 2026 mostra apenas **do início do ano até o mês corrente** (não exibe meses futuros).

### Colunas

Geradas dinamicamente:

1. Meses de 2026 `Jan…<mês atual>`, com os Qs inseridos quando completos (`Q1` após Mar, `Q2` após Jun, `Q3` após Set, `Q4` após Dez).
2. Em seguida o histórico fixo de 2025 da planilha: `Jul/25 | Ago/25 | Set/25 | Q3/25 | Out/25 | Nov/25 | Dez/25 | Q4/25`.
3. Fecha com `TOTAL 2026`.

Hoje (Jun/26) ficaria:
```
Jan | Fev | Mar | Q1 | Abr | Mai | Jun | Q2 | Jul/25 | Ago/25 | Set/25 | Q3/25 | Out/25 | Nov/25 | Dez/25 | Q4/25 | TOTAL 2026
```
Em Jul/26 a coluna `Jul` aparece automaticamente, e assim por diante; `Q3` só aparece quando Set/26 fechar.

### Merge das linhas

- Para cada label, percorrer as colunas de 2026 (geradas dinamicamente) e ler de `liveMap` — nunca cair na planilha para 2026.
- Para as colunas `jul25..q425`, ler de `sheetMap` (planilha).
- `total2026` continua vindo do `liveMap`.
- Labels que existem só na planilha (sem correspondente no live) ainda renderizam, mas suas colunas de 2026 ficam `—` (não há fonte ao vivo).

### Header

- Subtítulo: "2026 ao vivo (Pipefy + Meta/Google Ads + Oxy Finance) · 2025 da planilha".
- Mantém o badge "2025 · Snapshot (planilha indisponível)" quando `isFallback` for verdadeiro (planilha realmente caiu).
- Mantém o badge "2026 · Ao vivo".

## Arquivo

**Único arquivo:** `src/components/planning/marketing-indicators/ConsolidatedIndicators26Section.tsx`

1. Substituir o `COLS` estático por `buildCols()` que monta dinamicamente:
   - meses 2026 até o atual + Qs fechados + bloco fixo de 2025 + `TOTAL 2026`.
2. Reescrever `LIVE_COL_KEYS` como o conjunto derivado de `buildCols()` (todas as chaves geradas para 2026 + `total2026`). `SHEET_COL_KEYS` permanece como hoje: `jul25..q425`.
3. O merge atual já decide por coluna (live vs sheet); só precisa apontar para a nova `LIVE_COL_KEYS` dinâmica.
4. Atualizar o subtítulo do header conforme acima.
5. Exportação CSV segue a nova `COLS` (sem mudanças extras).

## Fora de escopo

- Não toco em `useIndicators26Live` nem em `useIndicators26Raw`.
- Não removo o consumo da planilha em outras telas.
