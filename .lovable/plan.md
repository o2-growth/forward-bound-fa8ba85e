
## Objetivo
Manter as colunas de **2025** (Jul/25 a Dez/25, Q3/25, Q4/25) vindo da **planilha Google Sheets** como hoje, e substituir as colunas de **2026** (Jan–Jun, Q1, Q2 e TOTAL 2026) por dados **ao vivo** dos hooks já existentes. Layout/ordem das colunas permanece igual.

## Estrutura de colunas (sem mudança visual)
```
Jan Fev Mar Q1 Abr Mai Jun Q2 Jul/25 Ago/25 Set/25 Q3/25 Out/25 Nov/25 Dez/25 Q4/25 TOTAL 2026
└──────── AO VIVO (2026) ────────┘ └──────────── PLANILHA (histórico 2025) ────────────┘ └─ AO VIVO ─┘
```

## Mapeamento linha → fonte ao vivo (apenas 2026)

### Aquisição / Mídia
- **Mídia Google Ads / Leads Google / CPL Google** → `useGoogleCampaigns` por mês (1 call anual com `breakdown=month` se possível, ou 6 calls paralelas Jan–Jun).
- **Mídia Meta Ads / Leads Meta / CPL Meta** → `useMetaCampaigns` análogo.
- **Mídia total / Leads totais / CPL total** → soma Meta+Google.
- **Leads no pipe / CPL no pipe** → `useMarketingAttribution` (cards Pipefy em "Novos Leads").
- **Instagram O2 / Pedro / Total** → `null` (sem fonte ao vivo; mostra "—").

### Funil MQL → Venda
Tudo de `useFunnelRealized` + `useModeloAtualAnalytics` + `useO2TaxAnalytics` + `useExpansaoAnalytics` + `useOutboundAnalytics`:
- MQL, SQL, RM, RR, Proposta, Vendas, No-show → contagens.
- CPMQL/CPSQL/CPRM/CPRR/CPP/CPV → Mídia ÷ contagem.
- Taxas → divisões diretas.
- **Tentativas/Atendidas/Conversas** → `null` (sem fonte).

### CAC & Unit Economics
- CAC = (Mídia + Time&Ferramentas) ÷ Vendas → `useDreDrillDown`.
- MRR/Setup/Pontual/Educação → `useModeloAtualMetas` + `useO2TaxMetas` + `useExpansaoMetas` + `useOxyHackerMetas` (já usado em `realRevenue`).
- GMV = MRR+Setup+Pontual+Educação.
- Run Rate / ARR = MRR×12.
- ARPU = Receita ÷ clientes ativos (`useOperationsData`).
- LT = 1 ÷ churn%; LTV = ARPU × LT; TCV = MRR×12+Setup+Pontual.
- Margem Bruta / LTV Final → `useDreDrillDown`.

### Base & Retenção
- Clientes ativos / churn / NRR → `useOperationsData` + `useNpsData`.
- MRR base → `useMrrBase` (`mrr_base_monthly`).
- Receita bruta → `useOxyFinance`.

### Eficiência & Retorno
- Time e ferramentas / Despesas totais → `useDreDrillDown`.
- Headcount → `useHrData`.
- Revenue per Employee = Receita ÷ Headcount.
- ROAS = GMV ÷ Mídia; LTV/CAC; ROI; ROI LTV → divisões.
- CAC Payback = CAC ÷ ARPU MRR.
- **ROI Pedro / ROI Pedro LTV** → `null`.

### Coluna TOTAL 2026
Soma das 12 colunas ao vivo (recálculo de ratios usando totais, igual ao `mergeMetrics` da Edge Function atual).

## Arquivos

### Novo
- `src/hooks/useIndicators26Live.ts`
  - Devolve `{ rows: { label: string; values: Partial<Record<'jan'|'fev'|'mar'|'q1'|'abr'|'mai'|'jun'|'q2'|'total2026', number|null>> }[] }`.
  - **Não** preenche as chaves `jul25..q425` — quem completa é a planilha.
  - Helpers: `bucketByMonth`, `quarterSum`, `recomputeRatios`.

### Alterado
- `src/components/planning/marketing-indicators/ConsolidatedIndicators26Section.tsx`
  - Chama `useIndicators26Raw()` (planilha) **e** `useIndicators26Live()` (ao vivo).
  - Mescla por label normalizado: para cada coluna, usa o valor da fonte correspondente:
    - `jan, fev, mar, q1, abr, mai, jun, q2, total2026` → live.
    - `jul25, ago25, set25, q325, out25, nov25, dez25, q425` → sheet.
  - Header passa a ter dois badges:
    - "2026 · Ao vivo" (verde, com timestamp `new Date()`).
    - "2025 · Planilha" (cinza, com `lastUpdate` da planilha).
  - Exportar CSV usa a versão mesclada.

### Inalterado
- `useIndicators26Raw` continua existindo (só serve as colunas de 2025 agora).
- Edge Function `read-marketing-sheet` mode `raw` permanece igual.
- Demais blocos da aba Marketing não mudam.

## Tratamento de gaps (sem fonte ao vivo em 2026)
Instagram, Tentativas/Atendidas/Conversas, ROI Pedro:
- Live retorna `null` → render mostra "—" com tooltip "Sem fonte ao vivo · entrada manual futura".

## Performance
- Buckets mensais reaproveitam o cache do React Query.
- Para Meta/Google APIs vou **tentar primeiro** uma única chamada anual com breakdown mensal:
  - `fetch-meta-campaigns`: aceitar parâmetro opcional `timeIncrement: 'monthly'` (Meta Insights).
  - `fetch-google-campaigns`: aceitar `breakdown: 'month'` (GAQL `segments.month`).
  - **Backwards compatible** — sem o parâmetro, comportamento atual permanece.

## Detalhes técnicos
- Sem mudança de schema/migration.
- Sem nova Edge Function — apenas extensão das duas Edge Functions de Ads (parâmetro opcional).
- Sem mudança em hooks existentes.

## Validação após implementar
- Abrir Marketing → seção "Visão Total".
- Conferir Jan–Jun/2026 batendo com Meta/Google Ads + Pipefy.
- Conferir Jul–Dez/2025 idênticos ao que aparece hoje.
- Verificar console sem erros e network sem 429.

---

Vou seguir com essa implementação assim que confirmar — me diga só:
**Posso adicionar o parâmetro opcional `breakdown=month` nas Edge Functions `fetch-meta-campaigns` e `fetch-google-campaigns`?** É o caminho limpo; alternativa é disparar 6 chamadas paralelas (Jan–Jun), funciona mas é menos eficiente.
