## Objetivo

Substituir o `FrenteFunnelCard` atual (barras horizontais simples) por um **funil de conversão premium** inspirado na referência: chips de filtro (Agregado + 1 por live/evento), 4 KPI cards no topo, cone colorido com % do topo e vs etapa anterior, e um "Comparativo entre itens" no rodapé. Aplicar às 3 frentes (Lives, Eventos, Seller).

## Fonte de dados

Você vai criar/popular a tabela no banco. Para o redesign avançar em paralelo, o componente vai receber os stages via **prop tipada** e um hook `useG4FunnelStages(frente, filtroId)` centraliza a leitura. Enquanto a tabela não existir, o hook retorna os stages "básicos" que já temos hoje (Inscritos → Levantaram a mão → Vendas) — nada quebra.

**Contrato esperado da tabela** (para você validar quando montar):

```text
g4_funnel_stages
  id            uuid pk
  frente        text ('lives' | 'eventos' | 'seller')
  item_slug     text  -- ex: 'live-20-05', 'connect-06-05', ou NULL = agregado
  stage_order   int
  stage_key     text  -- 'inscritos' | 'diagnostico' | 'entraram' | 'pico' | 'pitch' | 'mao' | 'vendas'
  stage_label   text
  value         numeric
  color_token   text  -- opcional; default por stage_key
  updated_at    timestamptz
```

Se preferir outro shape, ajusto o hook. Quando existir, migro o `useG4Analytics` para hidratar as sections com ela.

## Novos arquivos

- `src/components/planning/g4/FunnelDeluxe.tsx` — componente visual reutilizável (cone colorido, %topo, %etapa, sombra, tooltip).
- `src/components/planning/g4/FunnelFilterChips.tsx` — chips "Agregado · todos" + 1 por item, com estado controlado.
- `src/components/planning/g4/FunnelKpiRow.tsx` — 4 KPI cards do topo (Total, Meio, Interessados, Vendas) com gradiente sutil por cor da etapa.
- `src/components/planning/g4/FunnelComparativo.tsx` — grid de mini-cards por item no rodapé (Insc./Entr./Mão/Venda + conv %).
- `src/hooks/useG4FunnelStages.ts` — leitura da tabela (fallback para stages básicos).

## Arquivos alterados

- `src/components/planning/g4/LivesSection.tsx` — troca `FrenteFunnelCard` pelo bloco novo (Header + KpiRow + FilterChips + FunnelDeluxe + Comparativo). Remove os mini-cards antigos e a tabela "Detalhamento por Live" (redundante com Comparativo — mantenho só se você quiser).
- `src/components/planning/g4/EventosSection.tsx` — mesmo bloco, chips por evento (`G4_EVENTOS`).
- `src/components/planning/g4/SellerSection.tsx` — mesmo bloco, sem chips (só Agregado) já que Seller é fonte única.
- `src/hooks/useG4Analytics.ts` — expor `funnelByItem: Record<slug, FunnelStep[]>` além do agregado, para alimentar os chips no dia 1 com os dados básicos (Inscritos/Mão/Venda por live/evento).

## Visual (tokens)

Gradientes por etapa (green → cyan → yellow → orange → red), alinhados ao index.css:
- Inscritos: `from-emerald-400 to-lime-400`
- Diagnóstico: `from-cyan-400 to-teal-400`
- Entraram: `from-green-400 to-emerald-500`
- Pico presentes: `from-sky-400 to-cyan-400`
- Presentes no pitch: `from-yellow-400 to-amber-400`
- Levantaram mão: `from-orange-400 to-amber-500`
- Vendas: `from-rose-400 to-red-500`

Cada barra tem largura proporcional a `value / topo`, altura fixa (~64px), sombra difusa embaixo (mesmo gradiente com blur), label preto sobre gradiente. À direita da barra, coluna com "% vs etapa anterior".

## Comportamento dos chips

- Estado local por section: `selectedItem: string | 'all'`.
- Ao clicar em uma live/evento, `FunnelDeluxe` recebe `stages = funnelByItem[slug] ?? []` e recalcula %s.
- KPI row também recalcula para o item selecionado.

## Fora do escopo

- Custos/DRE — mantidos como estão.
- Formulário de input das etapas manuais — você criará via UI da tabela; se quiser, faço uma tab admin depois.
- Migração SQL — você vai montar; quando definir o shape final, ajusto o hook.

## Checkpoint

Depois de implementar, valido no preview via Playwright que:
1. Chip "Agregado" mostra soma correta.
2. Chip por item filtra KPIs + funil.
3. Fallback (tabela vazia) não quebra — mostra só as 3 etapas básicas.
