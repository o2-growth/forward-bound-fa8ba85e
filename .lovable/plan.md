## Objetivo
Congelar os números das lives já realizadas (20/05, 21/05, 17/06, 18/06) com os valores oficiais mostrados na tela, para que o funil e o comparativo parem de recalcular a partir dos cards do Pipefy e passem a exibir sempre esses números.

## Números a fixar

| Live | Inscritos | Entraram | Mão | Venda |
|---|---:|---:|---:|---:|
| Live 20/05 | 339 | 52 | 3 | 1 |
| Live 21/05 | 196 | 48 | 3 | 1 |
| Live 17/06 | 329 | 243 | 9 | 0 |
| Live 18/06 | 351 | 168 | 5 | 0 |

Lives futuras (ex.: 02/07) continuam calculadas a partir dos cards, sem override.

## Onde vai o dado
Novo arquivo `src/data/livesOfficial.ts` — mapa `dateISO → { inscritos, entraram, mao, venda }`. É a fonte de verdade oficial (você edita ali quando tiver novos números pós-live).

Não precisa mexer em banco. Se um dia a tabela `g4_funnel_stages` for populada com esses stages para a mesma live, o valor do banco ganha do arquivo (banco > override > cálculo).

## O que muda no código

1. **`src/data/livesOfficial.ts` (novo)**
   - Exporta `LIVES_OFICIAIS: Record<string, { inscritos; entraram; mao; venda }>` com as 4 lives acima.
   - Exporta helper `getOverride(dateIso)`.

2. **`src/components/planning/g4/LivesSection.tsx`**
   - Ao montar contagens de cada live no `compare`, se houver override → usa override; senão → `computeCounts`.
   - Ao trocar chip para uma live com override → KPIs e stages do funil usam o override (ainda mesclando com stages manuais do banco pelas etapas intermediárias: diagnóstico, entraram, pico, pitch).
   - Agregado ("all") = soma dos overrides das lives passadas + `computeCounts` das lives futuras (sem dupla contagem).

3. **`src/lib/g4Funnel.ts`**
   - `mergeStages` já respeita valores do DB por cima. Adicionar suporte a `overrideCounts` opcional (usado antes do fallback computado) para que os stages básicos (inscritos/entraram/mão/venda) reflitam o override quando presente.

## Comportamento visível
- Cards do comparativo entre lives exibem exatamente os números da imagem para 20/05, 21/05, 17/06, 18/06.
- Clicar em qualquer chip dessas lives → KPI row e cone-funnel abrem com os valores oficiais.
- Chip "Agregado" soma esses valores oficiais + o que vier do Pipefy para lives sem override.
- Live 02/07 e futuras continuam dinâmicas.

## Fora do escopo
- Não altero DRE / custos das lives (continuam vindos de `G4_LIVES`).
- Não altero Eventos nem Seller.
- Não crio tabela nova no banco.
