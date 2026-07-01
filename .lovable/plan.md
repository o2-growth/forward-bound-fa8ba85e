
# Auditoria — Aba Visão CEO

Vistoria no mesmo padrão da aba Marketing. Nada implementado ainda — só depois que você aprovar.

## Achados

### P1 — Números errados (não batem com o Comercial / Indicadores)

**1. Funil do CEO ≠ Funil do Comercial (MQL, Vendas, etc.)** ⚠️ *achado que você levantou*
`ComercialSection.tsx` usa `useFunnelRealized` (tabela `funnel_realized`, contagem **por fase do Pipefy**). Já a aba Indicadores Comercial usa:
- **MQL Modelo Atual / O2 TAX** = regra por **faturamento qualificado** (≥ R$ 200k / ≥ R$ 500k), independente da fase (mem: `mql-qualification-thresholds-v3`).
- **Venda** = dedup mensal `id+mês` preferindo "Ganho" sobre "Contrato assinado" (mem: `sales-monthly-card-dedup`).
- **Expansão** = funil cumulativo retrospectivo (mem: `expansion-cumulative-funnel-rules`).
Resultado: MQL, Venda e RM/RR do CEO divergem do Comercial.
Fix: consumir `useModeloAtualAnalytics` / `useO2TaxAnalytics` / `useExpansaoAnalytics` / `useOutboundAnalytics` (já importados) e derivar `real` de cada etapa a partir do MESMO agregador que a aba Comercial usa. Fallback pra `funnel_realized` só quando o analytics não expuser a etapa.

**2. Iteração de meses do funil ignora o ano**
`ComercialSection.tsx` monta `monthsInPeriod` só com nome do mês (`MONTHS[d.getMonth()]`). Período cruzando anos (ex.: dez/25 → fev/26) soma metas do ano errado.
Fix: iterar por `{month, year}` e casar `funnel_metas.year` também.

**3. DRE e Caixa — janela de meses assume mesmo ano**
`DreSection.tsx` e `CaixaSection.tsx` fazem `MONTHS_PT.slice(fromMonth, toMonth+1)`. Se `from` e `to` estão em anos diferentes o slice fica vazio ou invertido.
Fix: gerar lista `{year, monthPt}` e filtrar `dreLines`/`cashflowChart` por ano também.

**4. Meta vs Realizado em "Previsto x Realizado + Pace" desalinhados**
`realizadoFat` inclui Monetização (`includeMonetizacao: true`); `metaFat` vem de `consolidated.getMetaForPeriod` que NÃO tem meta de Monetização. Atingimento fica inflado.
Fix: excluir Monetização do realizado no CEO (como o filtro "Consolidado" da aba Comercial) **ou** somar meta de Monetização — decisão sua.

**5. Pipe de temperatura sempre em 4 BUs "fixas", não expõe filtro**
`aggregateByTemperatura` chamado com `ALL_BUS + Outbound + Monetização` fixos. A aba Comercial já respeita Closer/SDR/Origem/BU.
Fix: adicionar filtro de BU no header do CEO (achado P4-#11) e propagar; enquanto não, deixar claro no card.

### P2 — Coerência com o filtro de período

**6. "Receita/pessoa" mistura receita do período × headcount snapshot atual**
`PessoalSection.tsx`: `receita = sumMonths(...)` respeita filtro; `pessoas = headcountByBu(rawPessoas)` é snapshot. Períodos históricos distorcem.
Fix: usar headcount médio do período (ou do último mês do range).

**7. Base de clientes / Churn Rate ignora o filtro de data**
`FinanceiroSection.tsx` diz "Histórico total — ignora filtro" — disclosado, mas quando CEO escolhe "junho/2026" espera ver o churn do mês.
Fix: derivar churn do período a partir de `dataEncerramento` (mesmo padrão do CEO drill-down já implementado).

**8. Overview histórico do Comercial ignora o filtro (intencional, mas mal sinalizado)**
Fix cosmético: badge "janela fixa" ao lado do título.

### P3 — Fontes redundantes / duplo caminho financeiro

**9. Principais saídas (Caixa) vem de `useOxyExpenses` ≠ P&L do DRE (`useOxyFinance.dreLines`)**
Endpoints diferentes; podem não bater com "(−) Custos + Despesas" do P&L acima.
Fix: canonicalizar em `useOxyFinance` uma agregação de despesas (CV+DX+DF+DNO+AD+INV) e reutilizar no Caixa, ou mostrar diff.

**10. Fluxo de caixa (Caixa) usa `cashflowChart` do Oxy — regime caixa; DRE é competência**
Divergência esperada, mas não há legenda.
Fix: nota "regime caixa" + mini-comparativo Resultado Final (competência) × Saldo período (caixa).

**11. `getMetaForPeriod` do pace não passa pelo `faturamentoAggregator`**
Meta consolidada não reflete a dedução de "Ganho vs Contrato Assinado". Diferença pequena mas existe.
Fix: usar `faturamentoAggregator` também para meta.

### P4 — Cosmético / UX

**12. Header do CEO só tem data + PDF — falta filtro de BU** (chip Consolidado/Modelo Atual/TAX/Expansão/Franquia como no Comercial).

**13. Sem comparativo período anterior**
Marketing já ganhou deltas vs prev range; CEO ainda mostra só absoluto.
Fix: adicionar delta % em `MetricCard` (Realizado, Pipe total, Receita/pessoa, EBITDA, Saldo período).

## Como quero conduzir

Sugiro ondas (mesma cadência da vistoria de Marketing):
- **Onda 1 (P1):** achados 1–5 → corrigir números que estão errados hoje. **Achado 1 é o mais crítico** (o do MQL que você perguntou).
- **Onda 2 (P2):** 6–8 → alinhar tudo ao filtro de período.
- **Onda 3 (P3):** 9–11 → reconciliar fontes financeiras (Caixa × DRE × Oxy).
- **Onda 4 (P4):** 12–13 → filtro BU + deltas.

Preciso da sua decisão em:
- **#4** — Monetização entra ou não na meta CEO?
- **#12** — Adicionar filtro de BU no header?
Ou libera "ATAQUE TODOS" com defaults sensatos (excluir Monetização da meta CEO; adicionar filtro BU).
