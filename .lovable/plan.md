

## Bug: "Balburdia" aparece 2x na atribuição por canal (Meta Ads)

### Causa raiz

No `useMarketingAttribution.ts`, o agrupamento de campanhas usa a chave **raw** do CRM: `${info.campaign}::${info.channel}` (linha 241).

Alguns cards do CRM têm o campo `campanha` preenchido com o **ID numérico** da campanha Meta (ex: `120213456789`), enquanto outros têm o **nome** da campanha (ex: `Balburdia`). Isso gera duas entradas separadas no `campaignMap`:

- `120213456789::meta_ads` → resolve para nome "Balburdia" via API
- `Balburdia::meta_ads` → já tem o nome "Balburdia" diretamente

Ambas aparecem na tabela com o mesmo nome "Balburdia", mas com leads/métricas divididas entre elas.

### Correção

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useMarketingAttribution.ts` | Após construir o `campaignMap` e resolver nomes via API, **mergear entradas** que resolvem para o mesmo `campaignId` ou mesmo `campaignName` + `channel` |

**Abordagem**: Adicionar um passo de merge no loop de construção dos `funnels` (linhas 260-288). Ao invés de emitir diretamente um funnel por entrada do `campaignMap`, agrupar por `(resolvedCampaignId || resolvedCampaignName)::resolvedChannel`. Quando duas entradas colapsam na mesma chave, unir os Sets de leads/mqls/etc. e somar receita/tcv/investimento.

