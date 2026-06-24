## Diagnóstico

O Gustavo continua mostrando R$ 20.000 mesmo depois de trocar o mês porque há **duas causas combinadas** introduzidas pela última mudança:

### Causa 1 — Loop de render no `useSquadCostFromDre` invalida o cache antes de pintar

Adicionei `startDate` (objeto `Date`) ao array de dependências do `useMemo` que produz `matchedByPessoaNome`:

```ts
}, [..., isSingleMonth, startDate]);
```

`startDate` é recriado pelo parent a cada render (`new Date()` indireto via `dateRange`). Resultado:

1. Memo recomputa em todo render → `matchedByPessoaNome` ganha referência nova.
2. `useEffect` no `CfoView` (`[squadCost.matchedByPessoaNome]`) dispara, faz `setSquadRealVersion(v+1)`.
3. Render novo → loop. O console já mostra `Maximum update depth exceeded` em telas correlatas.
4. Enquanto o loop está ativo, o módulo `SQUAD_REAL_BY_PERSON` chega a ser preenchido, mas o modal lê o valor *antes* do `setState` aplicar — efeito visível: hardcoded R$ 20.000.

### Causa 2 — `prevMonthLabel` recalculado dentro do memo

Mesmo problema, mas como agora `prevMonthLabel` é string idêntica, basta tirar `startDate` do deps e movê-lo para fora do memo (usar `prevStart` já memoizado, que é string estável).

### Causa 3 (a confirmar) — chave de normalização

`normalize("Gustavo Ferreira Cochlar")` no hook não passa por nenhum stop word, mas a função strip tem `assessoria/consultoria/financeira/servicos` — Cochlar sobrevive. Vou logar no console (`console.debug`) o keyset de `matchedByPessoaNome` e o resultado de `normalizePersonKey("Gustavo Ferreira Cochlar")` no CfoView pra garantir paridade. Se diferir, ajustar para usar a mesma função `normalize` do hook.

## Plano

### 1. `src/hooks/useSquadCostFromDre.ts`

- Remover `startDate` do deps do `useMemo` principal. Manter apenas `prevStart`/`isSingleMonth` (strings estáveis).
- Mover cálculo do `prevMonthLabel` para fora do memo (computar a partir de `prevStart` que já é `useMemo`'d e string).
- Garantir que `caasCategories` seja estável: já vem de outro memo, mas confirmar que sua identidade só muda quando `pc.porBu` muda.

### 2. `src/components/planning/jornada/CfoView.tsx`

- Trocar `useEffect(..., [squadCost.matchedByPessoaNome])` por um efeito que só atualize quando o **conteúdo** mudar de fato. Opções:
  - Comparar `JSON.stringify` da chave ordenada → barato e suficiente.
  - Ou guardar versão derivada de `dataUpdatedAt` das queries do hook (expor um `version` numérico no retorno do hook, e usar isso como dep).

  Preferência: expor `matchedVersion: number` no hook (incrementa só quando uma das queries de drill atualiza). Mais robusto que stringify.

- Adicionar `console.debug` temporário para listar:
  - `Object.keys(SQUAD_REAL_BY_PERSON)` após cada update
  - `normalizePersonKey("Gustavo Ferreira Cochlar")` vs chave esperada
  - Valor resolvido para Gustavo no render do modal

  Se a chave estiver divergente, alinhar `normalizePersonKey` para reproduzir exatamente o `normalize` do hook (mesma remoção de stop-words/sufixos).

### 3. Validação

Depois do build:
- Abrir Jornada → CFO → trocar para Maio/2026 → abrir modal do Gustavo → confirmar fee ≈ R$ 21.043,67 (valor real do mês).
- Trocar para Junho/2026 → confirmar que Gustavo aparece com R$ 20.800 (real do mês corrente, se já tiver lançamento) ou com badge "(05/2026)" e R$ 21.043,67 (fallback).
- Confirmar no console que o warning `Maximum update depth exceeded` sumiu.

## Arquivos

- `src/hooks/useSquadCostFromDre.ts` — corrigir deps do memo, expor `matchedVersion`.
- `src/components/planning/jornada/CfoView.tsx` — depender de `matchedVersion` no `useEffect`; debug temporário pra validar a chave do Gustavo.
