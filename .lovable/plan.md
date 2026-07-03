## Objetivo
Aplicar no **Cenário de Caixa** a mesma regra já adotada no Funil de Monetização:
- Cards **em aberto** (qualquer fase que não seja Ganho/Concluído/Perdido) aparecem **independente do filtro de tempo** — para termos visibilidade do que está "na mesa".
- Cards **fechados** (Ganho/Concluído) continuam respeitando o filtro de período (hoje já são excluídos do Cenário de Caixa, então nada muda para eles).

Assim os cenários Realista (Quentes) e Otimista (Quentes + Mornos) refletem todo o pipeline vivo, não só o que entrou no período selecionado.

## Escopo
Alterar somente o Cenário de Caixa. Não mudar o comportamento da seção Temperatura nem do CEO View, que continuam filtrando por período.

## Mudanças

### 1. `src/components/planning/indicators/temperaturaAggregator.ts`
- Adicionar opção opcional em `AggregateInput`:
  ```ts
  includeAllOpenIgnoringPeriod?: boolean; // default false
  ```
- Quando `true`, o filtro `dataEntrada` (startTime/endTime) é **ignorado** para cards em aberto (já filtramos won/lost logo em seguida, então o resultado é: todos os cards ativos entram).
- Aplicar a mesma lógica no loop da Monetização (ignorar `entradaTime < startTime || > endTime` quando a flag for `true`).
- Comportamento default (`false`) permanece idêntico ao atual → `TemperaturaSection.tsx` e `ComercialSection.tsx` (CEO) não mudam.

### 2. `src/components/planning/indicators/CenarioCaixaSection.tsx`
- Passar `includeAllOpenIgnoringPeriod: true` ao chamar `aggregateByTemperatura`.
- Atualizar o subtítulo/tooltip:
  - "Escopo atual: {BUs}. Considera **todos os cards em aberto** (Quentes / Mornos), independente do período selecionado."
  - Adicionar linha no tooltip do 💰: "Cards fechados (Ganho/Concluído) e Perdidos são sempre excluídos. O filtro de período não se aplica aqui — o objetivo é mostrar o pipeline vivo."

### 3. (Sem alterações)
- `TemperaturaSection.tsx` — continua respeitando o período (é uma foto do que entrou no filtro).
- `ceo/ComercialSection.tsx` — idem.
- `CASH_RULES` e componentes de UI (DetailSheet, barras por BU) permanecem.

## Detalhes técnicos
- Dedup por `id` continua ativo (`byId` map). Sem filtro de data, ele passa a manter a versão mais recente considerando todo o histórico carregado por cada hook (`allCards` / `cards`).
- Nenhuma nova query externa — reutilizamos os dados já buscados pelos hooks de analytics.
- `queryKey` dos hooks de analytics não muda; a alteração é puramente de agregação client-side.

## Validação
1. Abrir Cenário de Caixa com filtro de mês corrente → contagem de cards deve subir (inclui cards antigos ainda abertos).
2. Trocar o filtro de período → totais de Realista/Otimista **não mudam** (dependem só das temperaturas dos cards abertos).
3. Aba Temperatura logo acima → **continua** variando conforme o período (comportamento antigo preservado).
4. Cards Ganho/Perdido continuam fora do Cenário de Caixa.
