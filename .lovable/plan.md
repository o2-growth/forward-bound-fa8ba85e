## Plano — Aba Typeform: fix do filtro + redesign UI/UX

### 1. Por que ainda aparece "até 100k / não faturamos / 100–200k / sem dado"

O filtro atual usa `includes` com strings exatas normalizadas. Se a view trouxer rótulos com pontuação, espaços extras, "Não" sem acento, ou variantes ("Faturamento de R$ 100 a 200 mil"), nenhum casa.

**Fix:** trocar para *match por palavras-chave* (após normalização):
- contém `"nao faturamos"` ou `"ainda nao"`
- contém `"menos de"` **e** `"100"`
- contém `"100"` **e** `"200"`
- string vazia / contém `"sem dado"`, `"sem dados"`, `"nao informado"`, `"n/a"`, `"null"`, `"-"`

Aplicar essa lista também em `openMainKpi`, `openSdr`, etc. quando montar `breakdowns: buildBreakdown(filtered, "faturamento", ...)` — caso contrário os Drawers continuam mostrando essas faixas.

Confirmar que `SdrBarChart` e o bloco `Funil por caminho (A/B/C/D)` continuam fora do render (já removidos no turno anterior, mantém).

### 2. Redesign UI/UX da aba (usando o design system do projeto)

Não vou trocar paleta/tipografia — uso o que já está em `index.css` / `tailwind.config.ts` (tokens semânticos `--background`, `--card`, `--muted`, `--primary`, `--chart-*`). O foco é hierarquia, densidade e consistência visual com o resto do app.

**Estrutura redesenhada (top → bottom):**

```text
┌─ Header da aba ──────────────────────────────────────────────┐
│ Diagnóstico O2 TAX · Typeform                                │
│ subtítulo curto · última atualização                         │
└──────────────────────────────────────────────────────────────┘

┌─ Janela temporal (segmented control, não 4 cards soltos) ────┐
│ [Hoje] [7d] [30d] [Mais antigo]    — pill com count ao lado  │
└──────────────────────────────────────────────────────────────┘

┌─ 4 KPIs principais (cards uniformes, mesma altura) ──────────┐
│ Leads · MQLs · Agendados · Conv MQL                          │
│ valor grande + sparkline/delta sutil opcional                │
└──────────────────────────────────────────────────────────────┘

┌─ Reuniões por dia (chart full-width, com header e legenda) ──┐
└──────────────────────────────────────────────────────────────┘

┌─ Próximas reuniões (tabela, header sticky, hover row) ───────┐
└──────────────────────────────────────────────────────────────┘

┌─ 2 col: Funil por faturamento │ Funil por setor ─────────────┐
└──────────────────────────────────────────────────────────────┘

┌─ Funil por UF (full-width OU 2 col com mapa simples) ────────┐
└──────────────────────────────────────────────────────────────┘

┌─ 4 KPIs secundários (Velocidade · sub-10 · sub-1h · Cobertura)
└──────────────────────────────────────────────────────────────┘
```

**Tratamento visual aplicado em todos os blocos:**

- Envelopar cada bloco em `<Card>` (`bg-card`, `border-border`, `rounded-lg`) com `<CardHeader>` (title + descrição curta) e `<CardContent>` — hoje vários estão "soltos" sem card.
- Espaçamento consistente: `space-y-6` no container, `gap-4` nos grids.
- Tabelas: usar `<Table>` do shadcn com `<TableHeader>` em `bg-muted/50`, linhas com `hover:bg-muted/30 cursor-pointer`, números alinhados à direita em `font-mono tabular-nums`, badges de status com `variant` semântico.
- KPIs: tipografia `text-3xl font-semibold tracking-tight`, label em `text-xs uppercase text-muted-foreground`, hint em `text-xs text-muted-foreground/70`. Estado clicável: borda fica `border-primary/40` e `shadow-sm` no hover.
- Skeletons em todos os loadings (`<Skeleton>` do shadcn), removendo placeholders "—" piscando.
- Empty states: ícone + frase curta em `text-muted-foreground` ao invés de linha em branco.
- Cores de chart vindas só de `hsl(var(--chart-1..5))` e `hsl(var(--primary))` — nada hardcoded.
- "Janela temporal" vira **segmented control** (`ToggleGroup` ou Tabs) horizontal compacto, em vez de 4 cards.
- "Cobertura SDR + Velocidade" agrupados numa faixa final menor (`KpiBig size="sm"` já existe — só padronizar visual).

### Detalhes técnicos

**Arquivos a editar:**
- `src/components/planning/typeform/TypeformDashboard.tsx` — novo layout, header, cards em volta dos blocos, fix do filtro `excluded`, propagar filtro para os `breakdowns`.
- `src/components/planning/typeform/leadsFilters.ts` — nova função `isFaturamentoExcluded(value)` exportada e reaproveitada em `buildBreakdown` (parâmetro opcional `excludeKeys`).
- `src/components/planning/typeform/KpiBig.tsx` — padronizar tipografia/hover/estado clicável.
- `src/components/planning/typeform/FunnelTable.tsx` — header sticky, hover row, alinhamento numérico, skeleton.
- `src/components/planning/typeform/TemporalKpisRow.tsx` — virar segmented control horizontal.
- `src/components/planning/typeform/BookingsByDayChart.tsx` — envelopar em Card, tooltip estilizado, eixos com `text-muted-foreground`.

**Sem mudança em:**
- `useTypeformData.ts` (hooks/queries iguais)
- `TypeformDetailDrawer.tsx` (drawer já bom)
- views do Supabase / edge functions

**Sem novas dependências.** Tudo com componentes shadcn já presentes (`Card`, `Table`, `Skeleton`, `ToggleGroup`, `Badge`).
