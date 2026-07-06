## Diagnóstico — por que Funil ≠ Acelerômetros

Comparando os prints (consolidado, mesmo período):

| Indicador | Funil | Acelerômetro | Δ |
|---|---|---|---|
| MQL | 34 | 41 | +7 |
| RM (Reunião Agendada) | 22 | 28 | +6 |
| RR (Reunião Realizada) | 18 | 19 | +1 |
| Proposta | 8 | 11 | +3 |
| Venda | 2 | 5 | +3 |

O acelerômetro é **sempre maior**. Rastreei as duas funções e a divergência vem de **três causas somadas**, todas do lado do acelerômetro:

### Causa 1 — Oxy Hacker e Franquia usam fonte diferente
- **Funil** (`ClickableFunnelChart` → `getOxyHackerAnalyticsQty` / `getFranquiaAnalyticsQty`): conta cards do **analytics hook** (Pipefy real, com lógica de first-entry, dedup mensal, exclusão de test cards).
- **Acelerômetro** (`getRealizedForIndicator` linhas 1170 e 1198): quando **não há filtro de closer/SDR/origem**, cai em `getOxyHackerQty` / `getExpansaoQty`, que lê da **planilha "Indicadores 26"** (dataset mais largo, throughput por fase sem dedup fino).

Resultado: mesmo card Oxy/Franquia pode aparecer 1x no funil e 2x no acelerômetro (ou aparecer no acelerômetro e nem estar no funil).

### Causa 2 — Monetização só entra no acelerômetro
`getRealizedForIndicator` linhas 1204‑1211 soma explicitamente `getFilteredMonetizacaoItems('proposta'|'venda')` no consolidado. O `ClickableFunnelChart` **não tem** esse bloco. Isso explica boa parte dos +3 em Proposta e +3 em Venda.

### Causa 3 — Modelo Atual e O2 TAX: iguais
Ambos usam `modeloAtualAnalytics` / `o2TaxAnalytics` nos dois lados → OK, batem entre si. A divergência **não** vem daqui.

### Fora do diagnóstico
- O TCV Hero Banner (`getItemsForIndicator('venda')` do funil) e o card "Vendas" do acelerômetro estão em fontes diferentes pelo mesmo motivo.
- Faturamento/MRR/Setup/Pontual dos cards monetários seguem os mesmos princípios (dedup por card+mês preferindo Ganho, sem Educação) e não estão desalinhados por definição — mas herdam o problema se a lista de "vendas" divergir.

---

## Plano de correção

Objetivo: **funil e acelerômetro devem responder à pergunta "quantos MQL/RM/RR/Proposta/Venda tivemos no período?" com o mesmo número**, respeitando os filtros ativos. Manter a hierarquia: Modelo Atual/O2 TAX/Oxy Hacker/Franquia + Monetização (transversal, só Proposta/Venda).

### Passo 1 — Criar helper único `getConsolidatedRealizedQty(indicator, filters)`
Novo arquivo `src/lib/consolidatedFunnelCounts.ts` que centraliza a soma por indicador com a MESMA regra dos 5 gates de BU já existente:
1. Modelo Atual → `modeloAtualAnalytics.getCardsForIndicator(indicator)` + filtro closer/SDR/origem.
2. O2 TAX → `o2TaxAnalytics.getDetailItemsForIndicator(indicator)` + filtro.
3. Oxy Hacker → **sempre** `oxyHackerAnalytics.getDetailItemsForIndicator(indicator)` (não mais `getOxyHackerQty` da planilha).
4. Franquia → **sempre** `franquiaAnalytics.getDetailItemsForIndicator(indicator)` (não mais `getExpansaoQty` da planilha).
5. Monetização (só `proposta`/`venda`, só quando consolidado e origem inclui `monetizacao` ou está vazia) → `getFilteredMonetizacaoItems`.

Isso resolve Causas 1 e 2 em um único ponto.

### Passo 2 — `ClickableFunnelChart` consome o helper
Trocar o cálculo de `totals` (linhas 187‑212) por chamadas ao helper. O funil passa a incluir Monetização em Proposta/Venda no consolidado.

### Passo 3 — `IndicatorsTab.getRealizedForIndicator` consome o helper
Substituir o corpo da função (linhas 1085‑1215) pela chamada única ao helper, removendo o branch que usa `getOxyHackerQty`/`getExpansaoQty` sem filtro.

### Passo 4 — Alinhar as listas de detalhamento (drill-down)
`ClickableFunnelChart.getItemsForIndicator` e `IndicatorsTab.handleRadialCardClick`/`getItemsForIndicator` também devem ler dos mesmos analytics hooks + Monetização, para que ao clicar num card do funil e no acelerômetro correspondente venha a **mesma lista** de cards.

### Passo 5 — Verificação
- Rodar no consolidado, período do print: os 6 números do funil (170/34/22/18/8/2) devem passar a bater com os 5 acelerômetros do topo (Leads não tem acelerômetro; MQL/RM/RR/Proposta/Venda devem ser idênticos).
- Testar com filtro de closer (ex.: Bruna → só Franquia) e SDR (ex.: Carlos → múltiplas BUs) para garantir que o gate por BU continua funcionando.
- Testar com filtro de origem `monetizacao` isolado — no funil, Proposta/Venda devem passar a mostrar os cards de Monetização.

### Impacto colateral esperado
- O acelerômetro de MQL/RM/RR pode **cair** em Oxy Hacker e Franquia (planilha somava mais que o Pipefy real). É o comportamento correto — a planilha é fallback histórico.
- O funil passa a somar Monetização em Proposta/Venda no consolidado (subida pequena, +3/+3 no print).
- Se você prefere manter a planilha como fonte para Oxy/Franquia (por decisão de negócio), invertemos: o funil passa a ler da planilha também. Preciso da sua decisão nesse ponto antes de implementar.

### Detalhes técnicos
- Nenhuma migração de banco.
- Nenhuma mudança em Edge Functions.
- Não altera regras de dedup, MQL thresholds, Ganho vs Contrato assinado, exclusão de test cards — todas já vivem dentro dos analytics hooks.
- Arquivos tocados: `src/lib/consolidatedFunnelCounts.ts` (novo), `src/components/planning/ClickableFunnelChart.tsx`, `src/components/planning/IndicatorsTab.tsx`.

---

**Decisão que preciso antes de implementar**: fonte única para Oxy Hacker e Franquia deve ser **analytics hook (Pipefy real, recomendado)** ou **planilha Indicadores 26 (fallback histórico)**?
