## Objetivo
Calcular **Custo de Pessoal** (3.2) usando o DRE Oxy Finance que já está sendo consumido — sem depender de uma lista exata vinda do usuário. Faço o match dos grupos/categorias do DRE por **padrões de label normalizados** (mesma estratégia que `useOxyFinance` já usa pra "Expansão" e produtos OXY).

## Mapeamento proposto (heurístico, baseado em DRE padrão)

Os grupos do DRE Oxy hoje vêm com `code` (`RB` = Receita Bruta) + `label`. Pra despesa de pessoal, normalmente o código fica em **`DP`** (Despesas Pessoal) ou similar — mas como não dá pra garantir sem ver o payload bruto agora, faço fallback duplo:

1. **Match por code**: aceitar qualquer grupo cujo `code` comece com `DP`, `CP`, `DEP` ou contenha `PESSO`.
2. **Match por label normalizado** (trim + lowercase + sem acento) — buckets:

| Bucket interno | Padrões aceitos no label |
|---|---|
| `folha` | "folha", "salario", "salarios", "ordenado" |
| `encargos` | "encargo", "inss", "fgts", "iss pessoal" |
| `beneficios` | "beneficio", "vale ", "vr", "va", "plano de saude", "convenio" |
| `prolabore` | "pro labore", "prolabore", "pro-labore" |
| `rescisao` | "rescisao", "rescisão", "demissao", "aviso previo" |

Tudo que matchar qualquer um dos buckets entra no **Custo de Pessoal total**. `rescisao` é exposto separado pra o card "Custo de turnover".

> Se na hora de rodar o DRE algum grupo não bater nenhum padrão, ele aparece num bloco "Não classificado (revisar)" no rodapé da 3.2 com o label cru, pra a gente afinar o regex sem cegueira.

## Implementação

### Backend
- Sem mudança. Já temos `action: 'dre'` em `fetch-oxy-finance` que retorna **todos** os grupos (só estou filtrando `code === 'RB'` no parser). Vou parar de filtrar pra também conseguir ler grupos de despesa.

### Hook novo: `src/hooks/usePersonnelCost.ts`
- Reusa `useOxyFinance(year).dreRaw`.
- Percorre `dreRaw.groups`, classifica cada grupo no bucket (`folha`/`encargos`/`beneficios`/`prolabore`/`rescisao`/`outros_pessoal`/`nao_classificado`).
- Soma `data[].value` por mês (mesmo `parseMonthFromDate` já existente).
- Filtra pelo range `[startDate, endDate]` que vem da `PessoasTab`.
- Retorna:
  - `custoTotalPeriodo`
  - `custoPorBucket` (objeto com os 5 buckets + valores)
  - `custoRescisaoPeriodo`
  - `gruposNaoClassificados` (array `{label, codigo, total}` pra debug)
  - `custoPorMes` (Record mês→valor) pra um mini gráfico de evolução

### UI: `PessoasTab.tsx` (3.2)
Substituir o bloco "Aguardando configuração" por:
- 4 KPI cards:
  - **Custo de pessoal total** = soma dos 5 buckets
  - **Custo / Receita** = total ÷ receita do período (já temos via `useOxyFinance.cashflowByMonth` ou `dreByBU`)
  - **Custo per capita** = total ÷ `headcountTotal` (do `useHrData`)
  - **Custo de turnover** = bucket `rescisao`
- Mini bar chart "Custo por bucket no período"
- Bloco colapsável "Grupos DRE não classificados" listando o que sobrou pra revisão (só aparece se `gruposNaoClassificados.length > 0`)

### Sem mexer
- Edge functions, RLS, schema, outras tabs.

## Riscos / próximo passo natural
- A heurística pode pegar um grupo errado (ex.: "Benefícios Fiscais"). Por isso o bloco de "não classificados" + o detalhe por bucket — se algo aparecer torto, ajusto os padrões na hora.
- Se o DRE Oxy não expõe despesas pelo mesmo endpoint `dre-table` (só receita), o hook vai retornar zerado e a gente troca pra `dre_categories` com um `groupIds[]` específico de Pessoal (precisaria do UUID — me passa depois).
