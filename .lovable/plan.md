

## Bug: Reuniões zeradas na aba Jornada

### Causa raiz

Dois problemas combinados:

1. **Filtro padrão = mês atual (Abril/2026)**: O componente `ReunioesView` inicia com o filtro de mês definido como `Abr/2026` (mês atual). Se ainda não existem rotinas de reuniões cadastradas para Abril no banco externo (Pipefy), a lista fica vazia e todos os KPIs mostram zero.

2. **Dependência errada no `useMemo`**: O memo `enriched` (linha 133) declara `[reunioes, now]` como dependências, mas usa `monthFiltered` internamente. Isso pode causar inconsistências quando o filtro de mês muda.

### Correção

| Arquivo | Alteração |
|---------|-----------|
| `src/components/planning/jornada/ReunioesView.tsx` | 1. Corrigir dependência do `useMemo` de `enriched`: trocar `[reunioes, now]` para `[monthFiltered, now]` |
| `src/components/planning/jornada/ReunioesView.tsx` | 2. Alterar o estado inicial de `filterMonth`: ao invés de sempre usar o mês atual, usar o último mês disponível nos dados (fallback para mês atual se não houver dados). Isso garante que ao abrir a aba, o usuário veja o mês mais recente com dados |

### Implementação

No `ReunioesView`:
- Calcular `availableMonths` antes do estado (ou usar `useEffect` para ajustar)
- Inicializar `filterMonth` com `''` (placeholder) e usar `useEffect` para setar o último mês disponível quando os dados carregarem
- Corrigir a linha 133: `}, [monthFiltered, now]);`

### Resultado esperado

Ao abrir a aba Reuniões, o filtro selecionará automaticamente o último mês com dados (provavelmente Março/2026), mostrando as reuniões cadastradas.

