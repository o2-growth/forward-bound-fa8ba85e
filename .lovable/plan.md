
## Problema

Dashboard subestima gasto histórico porque filtra Meta/Google por status atual (`ACTIVE/PAUSED` / `ENABLED/PAUSED`). Campanhas arquivadas depois de rodar somem, mas seu spend continua no painel oficial → divergência ao comparar meses passados.

Regra correta: se gerou spend no período, entra no dashboard. Status atual é irrelevante.

## Mudanças

### 1. `supabase/functions/fetch-meta-campaigns/index.ts`

- Remover filtro `effective_status` na URL de campanhas.
- Adicionar paginação seguindo `paging.next` até esgotar, com cap defensivo de 5000 campanhas para evitar loop infinito.
- Usar `limit=500` por página.
- Após enriquecer com insights via batch API, **filtrar localmente** as que tiveram `spend > 0` no período — assim só entram campanhas relevantes ao mês filtrado, evitando inflar a UI com lixo histórico zerado.
- Bump da cache key: prefixar com `CACHE_VERSION = "v2"` para invalidar cache antigo automaticamente sem mexer na tabela.
- Manter os `console.log` existentes; adicionar log de "campanhas após filtro spend>0" para observabilidade.

### 2. `supabase/functions/fetch-google-campaigns/index.ts`

- Remover a linha `AND campaign.status IN ('ENABLED', 'PAUSED')` da query GAQL. O `WHERE segments.date BETWEEN` já garante que só vem campanha com atividade no período.
- Bump da cache key com `CACHE_VERSION = "v2"`.
- Manter logs existentes.

### 3. Timezone (fase 2, opcional)

Não incluso neste plano. Pode entrar em commit separado depois — sem evidência clara de divergência hoje.

## Detalhes técnicos

**Paginação Meta (pseudo):**
```text
url = first page (limit=500)
campaigns = []
while url and campaigns.length < 5000:
  resp = fetch(url)
  campaigns.push(...resp.data)
  url = resp.paging?.next
```

**Filtro local de spend (Meta):** após `enrichCampaignsWithBatchAPI`, manter apenas itens com `parseFloat(c.insights?.spend ?? 0) > 0`. Google já vem filtrado pelo `segments.date`.

**Cache invalidation:** mudar apenas a string da `cacheKey`. Linhas antigas em `meta_ads_cache` expiram por TTL natural; não há migração de dados.

## Entrega

Commits sequenciais (Meta primeiro, depois Google). Sem mudanças no front. Typecheck automático do harness valida cada um.

## Validação pós-deploy

1. Mês corrente: deve continuar batendo.
2. Mês anterior com campanha arquivada: agora deve bater.
3. Mês de 3 meses atrás: divergência <1%.
