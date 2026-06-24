## Objetivo

Adicionar uma seção **Cenário de Caixa** logo abaixo da "Temperatura dos Leads" na aba Indicadores → Comercial, com dois cenários (Otimista / Realista) calculados a partir dos cards taggeados.

## Localização

- Arquivo novo: `src/components/planning/indicators/CenarioCaixaSection.tsx`
- Montagem: em `src/components/planning/IndicatorsTab.tsx`, renderizar imediatamente após o `<TemperaturaSection />`, recebendo as mesmas 4 analytics + `selectedBUs` + `startDate`/`endDate`.

## Regras de cálculo

Reaproveita o mesmo agregado de buckets (Quente / Morno / Frio) já feito em `TemperaturaSection` — mesma dedup por `id`, mesmo filtro de período, mesma resolução por BU via `selectedBUs`.

Para cada card considerado, aplicar **% por BU** sobre os campos monetários (`mrr`, `setup`, `pontual`), tratando MRR como valor mensal (1×):

| BU | MRR | Setup | Pontual |
|---|---|---|---|
| Modelo Atual | 0% | 75% | 50% |
| Outbound | 0% | 75% | 50% |
| Franquia (Expansão) | — | — | 70% |
| Oxy Hacker (Expansão) | — | — | 70% |

(Expansão hoje só tem Pontual — MRR/Setup ignorados mesmo se vierem ≠ 0.)

**Cenários:**
- **Realista** = soma dos cards `Quente` aplicando a tabela acima.
- **Otimista** = soma dos cards `Quente + Morno` aplicando a tabela acima.

Frios nunca entram.

## UI

Card com header `💰 Cenário de Caixa` e subtítulo explicando as premissas (mesmo escopo da seção de temperatura). Conteúdo: duas colunas (Realista | Otimista), cada uma mostrando:

- Total geral (formatCurrency)
- Quebra por BU ativa (Modelo Atual + Outbound somados, Franquia, Oxy Hacker) com mini-bar de proporção
- Sublinhas com nº de cards considerados
- Botão "Ver detalhes" que abre um `DetailSheet` com a lista dos cards do cenário, exibindo BU, Empresa, Temperatura, Setup considerado, Pontual considerado, MRR considerado, **Total Caixa** (soma dos 3 com %), e Entrada.

Tooltip pequeno (ícone `Info`) explicando as % usadas.

Se nenhum card Quente/Morno existir no escopo, não renderiza nada (igual à seção de temperatura).

## Detalhes técnicos

- Não duplicar lógica de agregação: extrair a função `aggregateByTemperatura(sources, selectedBUs, startDate, endDate)` em um helper compartilhado (`src/components/planning/indicators/temperaturaAggregator.ts`) usado por `TemperaturaSection` e `CenarioCaixaSection`. Mantém a `bu` tag (string label) em cada item para identificar a regra de % no cálculo de caixa.
- Helper `computeCashFromCard(item)` retorna `{ mrr, setup, pontual, total }` já com as % aplicadas, baseado em `item.bu`.
- `DetailItem` já tem `bu`, `mrr`, `setup`, `pontual`; adicionar colunas calculadas no `DetailSheet` via prop `format` ou montar items específicos do cenário.
- Nenhuma alteração em hooks de analytics, banco ou edge functions.

## Arquivos afetados

- **Novo**: `src/components/planning/indicators/CenarioCaixaSection.tsx`
- **Novo**: `src/components/planning/indicators/temperaturaAggregator.ts`
- **Editado**: `src/components/planning/indicators/TemperaturaSection.tsx` (passa a consumir o helper)
- **Editado**: `src/components/planning/IndicatorsTab.tsx` (renderiza a nova seção)
