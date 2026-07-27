## Contexto verificado

No banco espelho `pipefy_moviment_cfos`, o card `1409285792` (Invenzi) tem **todas** as colunas de valor de MRR nulas (`Valor MRR`, `Valor CFOaaS`, `Valor OXY`, `Valor Oxy`, `Valor Turnaround`, `Valor Valuation`, `Taxa de franquia`) nas 9 movimentações — só `Valor Setup` = 10.644,00. Ou seja, o espelho não traz os campos de MRR preenchidos no Pipefy. Por isso os ganhos do dash G4 aparecem zerados.

Solução: buscar os ganhos direto na API do Pipefy.

## Plano

### 1. Buscar os cards ganhos direto no Pipefy (`supabase/functions/g4-metrics/index.ts`)
- Manter o espelho como fonte da jornada (lives, inscritos, presença, mão levantada, fases) — ele funciona bem para isso.
- Após montar a lista de leads, coletar os `cardId` de todos os leads em **Ganho** (incluindo os da whitelist de Finders Fee).
- Consultar esses cards em lote na API GraphQL do Pipefy (`PIPEFY_API_KEY` já existe no projeto):
  ```graphql
  query { cards(ids: [...]) { id title current_phase { name } fields { name value field { label type } } } }
  ```
  em blocos de ~50 IDs, com `Promise.all`.

### 2. Recalcular os valores a partir dos campos reais do card
Para cada card ganho, somar por label (normalizado, sem acento, minúsculo):
- **MRR** = soma de todo campo cujo label case com `mrr`, `cfoaas`, `oxy`, `turnaround`, `valuation`, `taxa de franquia`
- **Setup** = campos com `setup`
- **Pontual** = campos com `pontual`
- **Educação** fica de fora dos totais padrão (regra já vigente no projeto)
- **TCV** = MRR×12 + Setup + Pontual
- Parser de valor tolerante a `R$`, ponto de milhar e vírgula decimal.

O valor vindo do Pipefy **sobrescreve** o do espelho para os cards ganhos; os demais leads seguem como estão.

### 3. Confiabilidade
- Se a chamada ao Pipefy falhar ou estourar timeout, cair de volta nos valores do espelho (nunca quebrar o dash).
- Incluir na resposta um campo `valoresFonte: "pipefy" | "espelho"` por card ganho, para eu conseguir auditar.
- Cache curto da resposta (mesma janela já usada pela função) para não bater no rate limit do Pipefy a cada refresh.

### 4. Frontend
`G4ConsolidatedDashboard.tsx` continua lendo `valorMRR` / `valorSetup` / `valorPontual` da função — sem mudança de fórmula. Remover o override manual do Martinelli se a soma vinda do Pipefy passar a bater sozinha.

### 5. Validação
Rodar `g4-metrics` e conferir os 9 ganhos do dash (Invenzi, Martinelli, Lotus, Tchau Entrega, Petromar, B2G Vix, Stillus Home, João Paulo, Fabrizio) campo a campo contra o Pipefy. Só reporto pronto quando os 9 baterem.

## Escopo
Só `g4-metrics` e o dash G4 (`/dash-g4` + aba G4 dos indicadores). Nada dos indicadores comerciais é tocado.
