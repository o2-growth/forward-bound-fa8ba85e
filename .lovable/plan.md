# Separar "Captação de Recursos" de "Assessoria Financeira"

## Causa raiz

Em `src/lib/productClassifier.ts` (linha 68), a regra `if (n.includes('assessoria'))` captura **qualquer** produto com a palavra "assessoria", incluindo "Assessoria de Captação de Recursos". Resultado: clientes como **Spa Med** aparecem no dashboard como *Assessoria Financeira*, quando no Pipefy o produto real é *Assessoria de Captação de Recursos*.

## O que fazer

### 1. `src/lib/productClassifier.ts`
- Adicionar `'Captação de Recursos'` ao tipo `ProductCategory` e ao array `PRODUCT_CATEGORIES` (posição antes de Assessoria Financeira).
- Em `classifyProduto`, **antes** da regra de `assessoria`, adicionar:
  - `if (n.includes('captacao'))  return 'Captação de Recursos';`
  - (a normalização `norm()` já remove acentos, então "captação" → "captacao")
- Estreitar a regra de Assessoria Financeira para exigir explicitamente `n.includes('financeira')` (ou padrão `assessoria financeira`) — evita futuros falsos positivos de outras "assessorias".

### 2. `src/components/planning/indicators/DetailSheet.tsx` (linha ~310)
- Adicionar cor de badge para `'Captação de Recursos'` (ex.: `bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200`) para exibição consistente com as demais categorias.

## O que NÃO muda

- Nenhuma lógica de `useJornadaData.ts` referente a `temAssessoriaFinanceira` / pipe dedicado de Assessoria Financeira — o pipe `pipefy_moviment_assessoria_financeira` continua marcando somente quem realmente é da Assessoria Financeira (já usa string exata na fonte).
- Filtros de BU, MRR, metas e cálculos monetários — só o **rótulo** do produto muda.
- Nenhuma migração de banco necessária.

## Validação

- Recarregar Indicadores › drill-down do cliente Spa Med → coluna Produto deve mostrar **Captação de Recursos**.
- Filtro de Produto na aba NPS / Jornada deve listar "Captação de Recursos" como opção independente.
- Clientes que hoje aparecem corretamente como Assessoria Financeira (via pipe dedicado) devem continuar como Assessoria Financeira.
