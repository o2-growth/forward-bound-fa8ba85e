

## Correção: "currentTotal is not defined"

### Problema
Em `useMetaRedistribution.ts` linhas 190-191, há referências a variáveis inexistentes:
- `currentTotal` → deveria ser `currentTotals.overall`
- `calculateNewTotal()` → deveria ser `validateTotal().newTotal`

### Plano
Editar `src/hooks/useMetaRedistribution.ts`, linhas 190-191:

```typescript
// DE:
total_before: currentTotal,
total_after: calculateNewTotal(),

// PARA:
total_before: currentTotals.overall,
total_after: validation.newTotal,
```

Uma única edição de 2 linhas resolve o erro.

