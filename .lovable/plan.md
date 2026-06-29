## Objetivo

Na aba **Indicadores Comercial**, criar um novo painel de **Eventos / G4** que quebra os leads vindos de eventos pelas suas **subcategorias** (G4 Summit, G4 Live, Evento Presencial, Speaker, Talkshow, 4AM, etc.), com funil completo, receita, conversões e drill-down de cards.

## Onde aparece

`src/components/planning/IndicatorsTab.tsx`, em uma nova seção colapsável **"Eventos · G4 — Subcategorias"**, logo abaixo dos filtros de origem (Inbound / Outbound / Evento / Indicação / Monetização). Respeita o mesmo `dateRange`, filtros de SDR/Closer e BU já existentes na aba.

## Como detectar a subcategoria

Fonte: campo `origemLead` do card Pipefy (já carregado em `AttributionCard`), com fallback para `tipoOrigem` e `campanha`. Classificação por palavras-chave normalizadas (lowercase + sem acento), na ordem:

```text
g4 summit            → "G4 Summit"
g4 live | live g4    → "G4 Live"
g4 presencial | evento presencial | imersao | imersão → "Evento Presencial"
speaker | palestra   → "Speaker / Palestra"
talkshow             → "Talkshow"
4am                  → "4AM"
g4 (sem qualificador)→ "G4 — Outros"
evento (sem g4)      → "Outros Eventos"
```

A regra fica num único helper `classifyEventSubcategory(card)` em `src/lib/eventSubcategory.ts` (fácil de evoluir conforme a equipe enviar novos valores).

## Estrutura visual

```text
┌─ Eventos · G4 — Subcategorias ───────────────────────────────┐
│  KPIs gerais (todos os eventos no período)                   │
│  [Leads] [MQLs] [RM] [RR] [Propostas] [Vendas] [Receita]    │
│                                                              │
│  Tabela por subcategoria (clicável, header sticky):          │
│  Subcategoria | Leads | MQL | RM | RR | Prop | Venda |       │
│                MRR | Setup | Pontual | TCV |                 │
│                Lead→MQL% | MQL→RR% | RR→Venda%               │
│                                                              │
│  Mini-funil ao lado quando uma linha está selecionada        │
└──────────────────────────────────────────────────────────────┘
```

Clique na linha → abre o `DetailSheet` já usado na aba (header sticky) listando os cards: Empresa, Subcategoria, Fase atual, SDR, Closer, MRR, Setup, Pontual, Data entrada, link Pipefy.

## Métricas (por subcategoria e total)

- **Funil**: Leads, MQLs, RM, RR, Propostas, Vendas — usando o mesmo `PHASE_FUNNEL_MAP` e regra cumulativa do `useMarketingAttribution` (consistência com o resto do dash).
- **Receita**: soma MRR, Setup, Pontual e **TCV = MRR×12 + Setup + Pontual** dos cards na fase de venda.
- **Conversões %**: Lead→MQL, MQL→RR, RR→Venda.
- **Dedup**: mesma regra do projeto (1 card conta no máx 1× por fase/mês; venda prefere "Ganho").

## Implementação técnica

1. **Novo helper** `src/lib/eventSubcategory.ts` — função `classifyEventSubcategory(card): string` + constante `EVENT_SUBCATEGORIES` (lista ordenada para render).
2. **Novo hook** `src/hooks/useEventSubcategoryAnalytics.ts` — recebe `allAttributionCards` + `dateRange`, filtra eventos (`leadSource === 'evento'`), agrupa por subcategoria, devolve `{ totals, bySubcategory[], getDetailCards(subcategory, stage) }`.
3. **Novo componente** `src/components/planning/indicators/EventosG4Section.tsx` — KPIs + tabela clicável + integração com `DetailSheet` existente.
4. **Wire-up** em `IndicatorsTab.tsx`: importar e renderizar a seção, passando os mesmos dados de cards já agregados ali (sem nova chamada externa — tudo derivado dos cards já em memória).
5. **Sem alteração de schema**: nenhuma migration, nenhuma edge function nova.

## Fora do escopo (não vou mexer)

- Aba Marketing (canal "Eventos" continua igual).
- Lógica de classificação de outros canais (Meta, Google).
- Metas/orçamento de eventos (pode virar uma fase 2 se você quiser).
