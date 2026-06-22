## Problema

Na aba Marketing → tabela "Indicadores 26 Consolidado", as linhas **Reunião marcada / No show / Reunião realizada / Proposta enviada / Vendas** (e tudo que depende delas — CPRM, CPRR, CPV, Taxa MQL/RM, Conversão MQL/Venda etc.) estão completamente erradas por mês. Janeiro mostra 0 em quase tudo, junho mostra 28 RM, etc.

## Causa raiz

`useIndicators26Live.ts` consome a tabela `funnel_realized` (via `useFunnelRealized`) como fonte do funil mensal. Conferi o conteúdo direto no banco:

```
2026: rm    jan=0  fev=2  mar=3  abr=12 mai=27 jun=27
      rr    jan=0  fev=0  mar=0  abr=2  mai=8  jun=5
      mql   jan=0 ... mai=9  jun=14
      venda jan=14 fev=14 mar=6  abr=11 mai=6  jun=0
```

A tabela `funnel_realized` é alimentada por sincronização do Google Sheet (`sync-from-sheets`), que está incompleta/desalinhada — é a fonte errada. O dashboard Comercial não usa essa tabela; usa direto `useModeloAtualAnalytics`, `useO2TaxAnalytics`, `useExpansaoAnalytics` (Franquia + Oxy Hacker), que leem cards do Pipefy via banco externo e já têm a regra correta (deduplicação por mês, `isMqlQualified`, `dataAssinatura` para venda, etc.).

A aba Marketing também já importa esses 4 hooks (`modeloA`, `o2taxA`, `franquiaA`, `oxyHackerA`) e os usa para agregar **Vendas/MRR/Setup**. Basta usar a mesma fonte para os demais indicadores do funil.

## Mudança

**Arquivo único:** `src/hooks/useIndicators26Live.ts`

1. Trocar a função `funnelByMonth(indicator)` (hoje lendo `funnel.data`) por uma nova `aggregateFunnelByMonth(indicator)` que:
   - Para cada uma das 4 BUs (Modelo Atual, O2 TAX, Franquia, Oxy Hacker) chama `hook.getCardsForIndicator(indicator)`.
   - Para cada card, usa `dataEntrada` como referência (ou `dataAssinatura || dataEntrada` quando `indicator === 'venda'`, alinhado à regra de Sales Date Prioritization já em uso na agregação de vendas).
   - Filtra `year === 2026` e soma 1 por card no mês correspondente.
   - Faz dedup adicional por `${bu}-${id}-${month}` para garantir contagem única por (BU + card + mês) mesmo que o hook já deduplique internamente.
2. Recalcular os arrays `leadsM`, `mqlM`, `rmM`, `rrM`, `propostaM`, `vendaM` a partir dessa nova função (vendaM mantém compatibilidade com `aggregateSales` que já existe — vou consolidar para uma única passada).
3. Remover a dependência do `funnel.data` no `useMemo` (sai do array de deps; `useFunnelRealized` pode até ser removido do hook ou mantido apenas se outras telas dependerem — vou apenas parar de usá-lo nos cálculos do Live).
4. Manter `Tentativas/Atendidas/Conversas/SQL` como `NULL_M` (não temos esses dados em Pipefy hoje).

Como consequência automática (mesmas células recalculam): **CPRM, CPRR, CPV, Taxa MQL/RM, Taxa RM/RR, Taxa RR/Proposta, Taxa Proposta/Venda, Conversão MQL/Venda, CAC, ROAS, ROI, LTV/CAC, Vendas/MQL, No show = RM − RR** voltam a bater com o dashboard Comercial.

## Validação

Depois de implementado, conferir na preview a linha "Reunião marcada" e "Vendas" mês a mês — devem bater com os totais do drill-down Comercial (que já usa a mesma fonte).

## Fora de escopo

- Não vou consertar a sincronização `funnel_realized` ← Google Sheet (continua existindo para quem usa, mas a aba Marketing deixa de depender dela).
- Não mudo nada nas linhas históricas 2025 (continuam vindo da planilha snapshot).
