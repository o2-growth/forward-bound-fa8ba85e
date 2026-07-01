
# P3 — Marketing: 5 fixes de consistência

## 1. Tabela "Indicadores 26" respeitar filtro de data

**Onde:** `ConsolidatedIndicators26Section.tsx`

**Mudança:**
- Derivar `visibleMonths` a partir do `dateRange` (from/to) recebido do `MarketingIndicatorsTab`.
- Filtrar colunas mensais e recalcular totais/deltas/YTD para o subset.
- `IndicatorTrendDialog` (linha clicável) já mostra série mês-a-mês — passar `visibleMonths` para destacar apenas o intervalo.

**Esperado:** ao mudar o período no topo, a tabela reflete só os meses selecionados; total da linha soma apenas esses meses.

---

## 2. `selectedBU` propagar para todos os componentes

**Onde:** `MarketingIndicatorsTab.tsx` + `marketingFunnelAggregator.ts` + seções filhas.

**Mudança:**
- Criar helper `filterCardsByBU(cards, selectedBU)` em `marketingFunnelAggregator.ts` (Modelo Atual = pipe X, O2 TAX = pipe Y, Expansão = pipe Z etc.).
- Aplicar antes de:
  - Hero cards (MRR, GMV, vendas, ticket)
  - Gauges de CAC/CPV/CPP
  - `SourceFunnelSection` (funil por canal)
  - `OverallResultsSection` (Resultados Gerais + comparativo prev)
  - `CostPerStageGauges` (custo por etapa)
- `salesInPeriod` e `salesInPeriodPrev` também respeitam o filtro.
- Investimento total continua global (não há investimento por BU segmentado); apenas as vendas/funis filtram.

**Esperado:** selecionar "Modelo Atual" reduz todos os números ao pipe correspondente; "Consolidado" mantém comportamento atual.

---

## 3. Investimento de Eventos real (remover R$ 25k hardcoded)

**Onde:** cálculo de CAC/CPV/CPP do canal Eventos em `MarketingIndicatorsTab.tsx` e `CostPerStageGauges`.

**Decisão de fonte:** criar tabela dedicada `event_investments` (mensal), editável na tela Admin — mesma UX das outras metas de investimento. Fallback zero.

**Migration:**
```sql
CREATE TABLE public.event_investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  valor numeric NOT NULL DEFAULT 0,
  descricao text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (year, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_investments TO authenticated;
GRANT ALL ON public.event_investments TO service_role;
ALTER TABLE public.event_investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read" ON public.event_investments FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write" ON public.event_investments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

**Frontend:**
- Hook `useEventInvestments(year, month?)`.
- Nova aba/subseção no Admin ("Investimento Eventos") para edit inline mês-a-mês.
- Substituir constante `EVENTOS_INVEST = 25000` por `eventInvestments[month]` (soma no range).
- Migrar automaticamente Jan–Jun/2026 com R$ 25k para não zerar histórico até você editar.

**Esperado:** CAC/CPV/CPP de Eventos reflete o real; admin edita direto no dashboard.

---

## 4. Online vs Offline com cohort correto

**Onde:** `OnlineOfflineSection.tsx` (dentro de Marketing).

**Problema atual:** classifica venda pelo canal *atual* do card na hora do agregado — se um lead entrou em março via Meta Ads mas o campo `fonte` mudou para "Indicação" antes de fechar em junho, ele aparece como Offline.

**Mudança:**
- Congelar o canal no momento de entrada (usar `dataCriacao` e o valor de `fonte`/`origem` que existia — o Pipefy DB já mantém movimentações; para cards sem histórico usar o snapshot atual mas guardar em `origem_cohort`).
- Reaproveitar `classifyLeadSource` com override de "canal congelado" via primeiro registro em `phase_history` (já usado em `useFunnelCohortMode`).
- Aplicar mesma regra em `OverallResultsSection` para consistência.

**Esperado:** venda de junho conta como Online/Offline conforme o canal que originou o lead (não o canal atual).

---

## 5. LTV unificado (uma única fórmula)

**Onde:** hero card LTV, `ChannelAttributionSection` drill-down, `OverallResultsSection`.

**Fórmula canônica:** `LTV = MRR médio × meses de retenção` (a que o hero já usa).

**Mudança:**
- Extrair para `marketingLtv.ts`: `computeLTV(salesCards, retentionMonths)` retornando `{ ltv, avgMrr, retention }`.
- `retentionMonths` vem do mesmo local que hoje alimenta o hero (config global ou default 24).
- Substituir a variante "ticket × 12" do drill-down por essa função.
- Adicionar tooltip explicando a fórmula em todos os pontos.

**Esperado:** LTV é o mesmo número no card grande, no drill-down por canal e nos resultados gerais.

---

## Ordem de execução

1. Migration `event_investments` + seed Jan–Jun/26 com R$ 25k (isolado, valida rápido).
2. Helper `filterCardsByBU` + propagação (mudança grande, valida com toggle de BU).
3. Filtro de data em `ConsolidatedIndicators26Section` (isolado).
4. `marketingLtv.ts` + substituições (isolado).
5. Cohort Online/Offline (usa infra do #2, faz por último).

## Fora do escopo

- Não mexer em Comercial, CEO, G4, NPS ou Operação.
- Não alterar cálculos de MRR/Setup/Pontual/GMV (já validados em P1/P2).
- Não criar novas metas — só investimento real de Eventos.
