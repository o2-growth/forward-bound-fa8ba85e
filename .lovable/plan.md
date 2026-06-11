# Adicionar colunas Setup / MRR / Pontual / Total nos drawers de Temperatura

## Onde

`src/components/planning/indicators/TemperaturaSection.tsx` — aba **Indicadores → Comercial → Modelo Atual**, seção "🌡 Temperatura dos Leads".

Hoje, ao clicar em Quente / Morno / Frio, o `DetailSheet` mostra:
Empresa · Fase Atual · Closer · SDR · MRR · Faixa · Entrada

## O que muda

Adicionar 3 colunas monetárias mantendo Faixa. Layout final:

1. Empresa
2. Fase Atual
3. Closer
4. SDR
5. **MRR** (já existe) — formato moeda
6. **Setup** (novo) — `valorSetup`, formato moeda
7. **Pontual** (novo) — `valorPontual`, formato moeda
8. **Total** (novo) — `MRR + Setup + Pontual` (exclui Educação, regra padrão do projeto), formato moeda
9. Faixa
10. Entrada

## Detalhes técnicos

- `analytics.toDetailItem(card)` em `useModeloAtualAnalytics` já expõe `mrr`. Vou conferir se `valorSetup` e `valorPontual` já estão no `DetailItem`; se não, adicionar no mapper e no tipo `DetailItem` (`DetailSheet.tsx`).
- Campo `total` calculado dentro do `toDetailItem` (ou inline antes de passar pro sheet) para não exigir mudança na assinatura de colunas.
- Reuso de `columnFormatters.currency`.

## Fora do escopo

Outras BUs, outras abas, aceleradores, ranking, funil — sem mudanças.
