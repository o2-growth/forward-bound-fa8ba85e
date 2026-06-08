# Mostrar os 8 MQLs "invisíveis" da Expansão

Não consigo consultar o Pipefy direto daqui (a edge function exige JWT do usuário logado). Em vez disso, vou expor esses cards **dentro do próprio dashboard**, na BU Expansão (Franquia), para você inspecionar quem são os 8 que somem ao filtrar SDR.

## O que vou fazer

### 1. Chip "Sem SDR atribuído" no drill-down de MQL (Expansão)
No mini-painel que abre ao clicar em MQL da Expansão, adicionar um chip abaixo do total:

```text
22 MQLs  •  ⚠ 8 sem SDR atribuído no Pipefy  [ver lista]
```

Ao clicar em **[ver lista]**, abre uma tabela com:

| Título | ID Pipefy | Fase atual | Data entrada MQL | Investimento | SDR (efetivo) | Closer (efetivo) |

Só aparecem os cards cujo `effectiveSdrByCard.get(id)` retornou `null` (nunca tiveram SDR em nenhum movimento do histórico).

### 2. Link direto pro Pipefy em cada linha
Cada título vira link `https://app.pipefy.com/pipes/<pipeId>/cards/<cardId>` (usando o `deep-linking-config-v2` já existente), pra você abrir e ver na hora se é lead órfão, perdido, duplicado ou ICP-fora.

### 3. Console.log temporário (debug)
Em `useExpansaoAnalytics.ts`, log único por render listando os cards sem SDR efetivo:

```text
[Expansao MQL sem SDR] Jun/2026 Franquia:
  - 1234567 "Empresa X" | fase=Lead | inv=R$15-30k | closer=null
  - 1234568 "Empresa Y" | fase=MQL  | inv=R$30k+   | closer=Bruna
  ...
```

Removo o log depois que confirmarmos a causa.

## Arquivos afetados

- `src/hooks/useExpansaoAnalytics.ts` — expor `getCardsWithoutSdr(indicator)` + log
- `src/components/planning/ClickableFunnelChart.tsx` ou o drill-down de MQL Expansão — renderizar o chip + tabela
- Escopo restrito à **Expansão (Franquia + Oxy Hacker)**, não toca Modelo Atual nem O2 TAX

## Decisão de regra (continua pendente, mas independente do debug acima)

Depois que você ver os 8 cards, decidimos:
- Se forem órfãos legítimos (perdidos / sem trabalho) → mantém 14 e o chip vira a explicação permanente.
- Se forem cards válidos da Bruna/Kethlin → mudamos a regra pra "todo lead Franquia conta pros SDRs da BU" via fallback `BU_SDRS['franquia']`.

Confirma que posso implementar esse painel de inspeção?
