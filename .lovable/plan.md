

## Adicionar Macro 2025, Macro 2026 e Financeiro como abas ocultas

### Alteração

Apenas uma linha precisa ser modificada em `src/pages/Planning2026.tsx`:

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Planning2026.tsx` | Linha 39: adicionar `'context'`, `'goals'` e `'financial'` ao array `HIDDEN_TABS` |

**De:**
```ts
const HIDDEN_TABS: TabKey[] = ['marketing', 'structure'];
```

**Para:**
```ts
const HIDDEN_TABS: TabKey[] = ['context', 'goals', 'financial', 'marketing', 'structure'];
```

As três abas passarão a ficar ocultas por padrão e só aparecerão ao clicar em "Mostrar abas ocultas" no header, exatamente como já funciona para Marketing e Estrutura.

