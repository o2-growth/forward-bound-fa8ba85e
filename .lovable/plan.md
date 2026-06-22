## Diagnóstico

### 1) Setup do Modelcraft = R$ 0 no drill-down de Vendas (Comercial)
- **Causa raiz**: na tabela externa `pipefy_moviment_cfos` (de onde o `useModeloAtualAnalytics` lê as vendas) o card 1359038764 tem `"Valor Setup": null`, embora no Pipefy o campo `valor_setup` esteja R$ 10.800,00 (confirmei via API do Pipefy).
- O código (`useModeloAtualAnalytics.tsx` linha 174) já lê `row['Valor Setup'] || row['valor_setup']` corretamente.
- **Não é bug de código** — é defasagem de sincronização do DB externo → o job externo (que popula `pipefy_moviment_cfos`) precisa rodar para puxar a atualização desse campo.

### 2) Visão Total — Indicadores 26 (aba Marketing): números errados após a última mudança
- **Google Ads "Mídia R$ 0"** mas com leads preenchidos: bug no parser. O `fetch-google-campaigns` já devolve `cost_micros` somado num campo, mas o `useIndicators26Live` está somando errado (fallback nunca acerta).
- **MRR/Setup/Pontual irrisórios** (MRR fev R$ 96, mar R$ 94): hoje uso `getMrrForPeriod/getSetupForPeriod/getPontualForPeriod` dos hooks de metas, que filtram por `dataEntrada` (data de movimentação no Pipefy) **e não por "Data de assinatura do contrato"**, que é a regra-mestra do projeto. Resultado: vendas de O2 TAX/Expansão não entram, e Modelo Atual fica deslocada no mês errado.
- **Linhas vazias** (Clientes ativos, Churn, ARPU, LT, LTV, Time/Ferramentas, Despesas, ROAS LTV, CAC Payback, ROI LTV): nunca plugadas — ficaram `null`.

---

## O que vou fazer

### A. Setup do Modelcraft (Comercial — não-código)
- Sinalizar no chat que o problema é defasagem do DB externo (campo `Valor Setup` = null em `pipefy_moviment_cfos` para o card 1359038764).
- **Não vou tentar gravar manualmente em `pipefy_moviment_cfos`** (é um espelho do Pipefy mantido por job externo — qualquer override seria sobrescrito no próximo sync e gera inconsistência).
- Próximo sync do job externo deve trazer R$ 10.800 e o drill-down passa a refletir.

### B. Reescrever `useIndicators26Live` para usar as MESMAS fontes do dashboard comercial

**B.1 — Receita mensal (MRR / Setup / Pontual / Educação / GMV)**
- Trocar `useModeloAtualMetas/useO2TaxMetas/useExpansaoMetas/useOxyHackerMetas.getMrrForPeriod(...)` pelos **hooks de Analytics** (`useModeloAtualAnalytics`, `useO2TaxAnalytics`, `useExpansaoAnalytics`, `useOxyHackerAnalytics`), que retornam `salesCards` já desdobrados em `valorMRR/valorSetup/valorPontual/valorEducacao` por card.
- Agregar por mês usando `dataAssinatura` (com fallback `dataEntrada` da fase Ganho) — exatamente como o drill-down de Vendas faz.
- Deduplicar por `id + mês` (regra de memória `sales-monthly-card-dedup`).

**B.2 — Google Ads "Mídia R$ 0"**
- Corrigir parsing em `useIndicators26Live.ts`: a resposta de `fetch-google-campaigns` traz `investment` (já em reais) ou `cost_micros` (1e6) dependendo da campanha. Usar `Number(c.investment ?? (c.cost_micros||0)/1_000_000)` como spend e `Number(c.leads ?? c.conversions ?? 0)` como leads.
- Validar com `supabase--curl_edge_functions` antes de salvar.

**B.3 — Linhas hoje em "—" (todas as que conseguir plugar)**
- **Clientes ativos / MRR base / Receita bruta**: via `useOperationsData` (clientes ativos por mês) + `useMrrBase.getMrrBaseForMonth` (já plugado) + `useOxyFinance.cashflowByMonth` (já plugado).
- **Churn (Logo, Revenue, NRR, Net Customer Growth)**: via `useNpsData` (churns mensais) + `useOperationsData` (base de clientes para denominador).
- **ARPU / LT / LTV**: via `useOperationsData` (ARPU = MRR Base / Clientes Ativos; LT = 1 / churn rate; LTV = ARPU × LT).
- **Time e ferramentas / Despesas totais / Margem Bruta / CAC Payback**: via `useDreDrillDown` (linhas Pessoal+Ferramentas / Despesas Totais / Margem). CAC Payback = CAC / ARPU.
- **ROAS LTV / ROI LTV / LTV/CAC**: derivados — ROAS LTV = LTV × Vendas / Mídia, LTV/CAC = LTV / CAC.
- **Headcount**: aceitar limitação do `useHrData` (snapshot atual, 57 fixo em todos os meses) — adicionar tooltip "snapshot atual; histórico não disponível".
- **Continuam em "—" (sem fonte automatizada)**: Instagram O2/Pedro/Total, SQL/CPSQL/SQL ratios, Tentativas/Atendidas/Conversas, ROI Pedro, ROI Pedro LTV, ROI LTV Final, Risco/Pedido de churn (manual).

### C. Verificação
- Após cada bloco (B.1, B.2, B.3), rodar `supabase--curl_edge_functions` + abrir a aba via Playwright headless para confirmar valores plausíveis (MRR jan 2026 esperado ~R$ 700k somando todas as BUs; Mídia Google Ads esperado > R$ 0).

---

## Fora do escopo
- Backfill do `Valor Setup` do Modelcraft no DB externo (depende do job de sync externo).
- Inputs manuais Instagram/Tentativas/ROI Pedro (precisa de tabela `marketing_manual_inputs` — proposto antes, ainda não confirmado).
- Refatorar `useIndicators26Raw` ou snapshot 2025 (continuam intactos).

---

## Arquivos alterados
- `src/hooks/useIndicators26Live.ts` (reescrita das seções de receita, Google Ads parser, plug de Operations/NPS/DRE).
- Possível pequeno ajuste em `src/components/planning/marketing-indicators/ConsolidatedIndicators26Section.tsx` (tooltip do Headcount).

Sem migrations. Sem mudanças em edge functions.