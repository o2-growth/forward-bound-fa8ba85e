## Diagnóstico

Você está certo: **são campos diferentes no Pipefy**.

- **Modelo Atual / O2 TAX** → usam o campo `Faixa de faturamento mensal` (ex.: "Entre R$ 200 mil e R$ 350 mil"). É isso que aparece na coluna "Faixa Faturamento" do drilldown.
- **Franquia / Oxy Hacker (Expansão)** → não têm `Faixa de faturamento mensal`. Eles usam o campo `Investimento disponível` (ex.: "Menos de 36 mil reais", "Entre 36 e 54 mil reais", etc.).

No código atual (`src/hooks/useExpansaoAnalytics.ts`, função `toDetailItem`, linhas 419-439), o item gerado para cards de Franquia/Oxy Hacker **não preenche o campo `revenueRange`** — por isso a coluna mostra "-" e o gráfico "Por Faixa de Faturamento" agrupa tudo em "Não informado" (foi exatamente o que você viu nos 48 MQLs do print).

Confirmei na base que o dado existe: o card do Heraldo Carvalho (Franquia, Lead/MQL de Maio/2026) tem `Investimento disponível = "Menos de 36 mil reais"`, mas esse valor nunca é repassado pro drilldown.

## Mudança proposta

Apenas frontend, mudança cirúrgica em **um único arquivo**:

### `src/hooks/useExpansaoAnalytics.ts`

Em `toDetailItem` (linha 419), preencher `revenueRange` com o `Investimento disponível` do card (usando o `cardInvestimentoMap` que já existe no hook, com fallback para `card.investimentoDisponivel`):

```ts
const toDetailItem = (card: ExpansaoCard): DetailItem => ({
  id: card.id,
  name: card.titulo,
  company: card.titulo,
  phase: PHASE_DISPLAY_MAP[card.faseAtual] || card.faseAtual,
  date: card.dataEntrada.toISOString(),
  // ... resto igual ...
  revenueRange: cardInvestimentoMap.get(card.id) || card.investimentoDisponivel || undefined,
});
```

Como `toDetailItem` é declarada dentro do hook, ela já tem acesso ao `cardInvestimentoMap` por closure.

## Resultado esperado

No drilldown de MQL (`MQL - De Onde Vêm Nossos Melhores Leads?`):

- Cards de **Modelo Atual / O2 TAX**: continuam mostrando faixas tipo "R$ 200k - 350k" (inalterado).
- Cards de **Franquia / Oxy Hacker**: passam a mostrar a faixa de investimento (ex.: "Menos de 36 mil reais", "Entre 54 e 140 mil reais", etc.) na coluna "Faixa Faturamento" e no gráfico de distribuição.

A coluna continua se chamando "Faixa Faturamento" — semanticamente é a mesma ideia (a faixa de qualificação do lead), só que o nome do campo na origem é diferente. Se você preferir renomear pra algo neutro tipo "Faixa / Investimento", me avisa que ajusto também.

## Fora de escopo

- Não vou mexer na lógica de qualificação de MQL (já está correta: qualquer `Investimento disponível` preenchido qualifica para Franquia/Oxy Hacker).
- Não vou tocar em `useExpansaoMetas.ts` nem `useOxyHackerMetas.ts` — só o caminho do drilldown.
