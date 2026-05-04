## Objetivo

Excluir o card de teste **G4** (ID Pipefy: `1342531906`) das contagens de Vendas (e demais indicadores) para Abril/26 e qualquer outro período.

## Implementação

**Arquivo único:** `src/hooks/useModeloAtualMetas.ts`

Adicionar o ID `'1342531906'` ao set `TEST_CARD_IDS` (linha 57–62):

```ts
const TEST_CARD_IDS = new Set([
  '1320546949', // TESTE
  '1320177174', // 123
  '1308003007', // Empresa Teste
  '1320175421', // teste duda
  '1342531906', // G4 (card de teste - Abril/26)
]);
```

## Efeito

A função `isTestCard()` é usada em todos os hooks de analytics da BU Modelo Atual:
- `useModeloAtualAnalytics.ts` (MQLs, Vendas, funil completo)
- `useModeloAtualMetas.ts` (cálculos consolidados)

O card será automaticamente removido de:
- Vendas de Abril/26 (e qualquer mês)
- MQLs, Leads, RM, RR, Propostas
- GMV, MRR, Setup, Pontual da BU Modelo Atual
- Drill-downs e gauges

## Validação

Após implementar, verificar na aba Indicadores → Modelo Atual → Abril/26 que a contagem de Vendas caiu em 1 e o valor monetário do G4 saiu do MRR/Setup/Pontual.

## Não alterar

- Nenhuma migration de DB (a regra é client-side, padrão do projeto).
- Nenhum outro arquivo.
