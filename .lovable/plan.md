## Diagnóstico

Em `src/components/planning/MarketingIndicatorsTab.tsx` (linhas 506-515) a variável `salesInPeriod` — que alimenta **Cohort de Entrada**, **Cohort de Assinatura**, **Curva de Conversão** e **Online vs Offline** — é construída assim:

```ts
return allAttributionCards.filter(c => c.dataAssinatura in periodo)
```

Onde `allAttributionCards` é a união dos 5 hooks (`modeloAtualAllCards`, `franquiaCards`, `oxyHackerCards`, `outboundAllCards`, `o2TaxAllCards`) — ou seja, **TODOS os cards de cada BU**, não só vendas.

Isso gera 3 problemas que somam até inflar para 184:

1. **Sem filtro de fase de venda.** Qualquer card com `dataAssinatura` preenchida entra na conta, mesmo perdidos depois, em elaboração, ou em fases posteriores. A regra do projeto (memória `sales-phase-universal-definition`) é contar venda só quando a fase está em `Contrato assinado` / `Ganho` (e fases equivalentes por BU).

2. **Double-count Outbound → Modelo Atual / Tax.** Um lead Outbound que vira venda aparece duas vezes: uma no pipe Outbound (com `outbound_` prefix) e outra no pipe Modelo Atual ou O2 TAX (id cru). IDs diferentes → não dedup.

3. **Sem dedup mensal/por card.** A regra `funnel-deduplication-rules-v2` exige no máx 1 contagem por card/fase/mês — `salesInPeriod` não aplica isso.

O resto do dashboard (`pipefyVolumes.vendas`) usa `getCardsForIndicator('vendas')` que já aplica fase + dedup corretamente — por isso aquele card no topo bate, mas as 4 seções novas não.

## Correção

Trocar a construção de `salesInPeriod` para reusar os mesmos `getCardsForIndicator('vendas')` que já aplicam fase + dedup, e deduplicar entre BUs pelo ID base (sem prefixo) e/ou empresa normalizada.

### Passos

1. **Em `MarketingIndicatorsTab.tsx`, substituir o bloco `salesInPeriod` (linhas 506-515)** por:
   - Coletar vendas de cada BU via `maGetCards('vendas')`, `o2GetCards('vendas')`, `franquiaGetCards('vendas')`, `oxyGetCards('vendas')`, `outboundGetCards('vendas')`.
   - Para cada coleção, mapear para `AttributionCard` (mesma forma do `push` que já existe em `leadsInPeriod` linhas 497-501), com prefixos consistentes (`outbound_`, `oxy_`, `o2tax_`).
   - Concatenar e deduplicar por chave `${baseId}|${empresaNormalizada}` (strip dos prefixos `outbound_`, `oxy_`, `o2tax_`) — prevalece o registro do pipe "destino final" (ordem: Modelo Atual > O2 TAX > Franquia > Oxy Hacker > Outbound).
   - Filtrar para `dataAssinatura` dentro de `[dateRange.from, dateRange.to]`. Se `dataAssinatura` for null mas o card foi contado em `vendas` pelo getCardsForIndicator (que já valida período), usar `dataEntrada` como fallback só pra Cohort de Entrada — mas em Cohort de Assinatura e Curva, excluir os sem `dataAssinatura`.

2. **Sanity log temporário** (dev only): console.log de `salesInPeriod.length` por BU antes/depois do dedup, para validar o número final contra `pipefyVolumes.vendas`. Remover depois.

3. **Validação manual:** mês passado (filtro do usuário) → o número de linhas total na Cohort de Entrada deve bater com `pipefyVolumes.vendas` mostrado no topo do dashboard. Se ainda divergir, comparar lista de IDs.

### Arquivos editados

- `src/components/planning/MarketingIndicatorsTab.tsx` (apenas o `useMemo` do `salesInPeriod`).

Nenhum outro componente precisa mudar — `CohortTable`, `ConversionCurveSection` e `OnlineOfflineSection` recebem `salesCards` corrigido e funcionam automaticamente.

### Não-objetivos

- Não vou mexer em leads/MQLs (filtro do usuário não acusou divergência ali).
- Não vou mexer em investimento/CAC (mesma razão).
- Não vou mexer nos hooks de BU — a lógica de "o que é venda" já está certa neles via `getCardsForIndicator`.
