## Problema

O card `1317180165` (Ediouro) aparece como venda G4, mas não fechou pelas lives/eventos. O filtro `isG4Attributed` atual só olha origem do Pipefy — se o lead tiver `levantouMao`, `presenteAlgumaLive` ou `fezDiagnostico=true`, entra no G4 mesmo se a origem real foi outra. Provavelmente é o caso da Ediouro (email cruza com base de inscritos G4).

## Solução

Adicionar exclusão manual **hardcoded por ID de card** que roda **antes** de qualquer whitelist, em `src/components/planning/g4/G4ConsolidatedDashboard.tsx`.

```ts
const MANUAL_EXCLUDED_G4_CARD_IDS = new Set<string>([
  "1317180165", // Ediouro — fechou fora do G4
]);

export function isG4Attributed(l: G4RealLead): boolean {
  if (MANUAL_EXCLUDED_G4_CARD_IDS.has(String(l.cardId))) return false;
  // ...resto igual
}
```

Isso remove a Ediouro dos totais (Leads, MQLs, Vendas, MRR, Setup, Pontual, TCV) e do drill-down do dashboard G4. O contador `excludedByOrigin` já mostra os excluídos, então o ajuste fica visível.

## Fora do escopo

- Não mexer na edge function `g4-metrics`.
- Não alterar o dashboard interno (Modelo Atual) — a venda continua contando lá, que é o comportamento correto.
- Não criar UI de gerenciamento de exclusões.

## Próximo passo

Confirmar que o campo em `G4RealLead` é `cardId` (vou verificar no build).
