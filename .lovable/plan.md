## Adicionar Thiago e Amanda Serafim como Closers de Modelo Atual

### Estado atual
- Closers cadastrados em `src/hooks/useCloserMetas.ts`: **Pedro Albite**, **Daniel Trindade**, **Lucas Ilha**.
- `BU_CLOSERS.modelo_atual` = `['Pedro Albite', 'Daniel Trindade']`.
- "Amanda" hoje aparece apenas como **SDR** de Modelo Atual em `IndicatorsTab.tsx` (mantém-se nessa lista).
- Metas de closer (`closer_metas`) já são auto-seedadas; precisam ganhar linhas para os novos closers.

### Mudanças

**1. `src/hooks/useCloserMetas.ts`**
- Expandir constante `CLOSERS` para incluir `'Thiago'` e `'Amanda Serafim'`.
- Atualizar `BU_CLOSERS.modelo_atual` para `['Pedro Albite', 'Daniel Trindade', 'Thiago', 'Amanda Serafim']`.
- Default de `getPercentage` permanece 50% quando BU tem >1 closer (ficará 25% efetivo se todos selecionados, ajustável depois pelo Admin).

**2. `src/components/planning/IndicatorsTab.tsx`**
- Lista `allClosers` (linha ~488) já é construída a partir de `BU_CLOSERS`, mas há um array fixo de labels — adicionar entradas `{ value: 'Thiago', label: 'Thiago' }` e `{ value: 'Amanda Serafim', label: 'Amanda Serafim' }` no array de opções de closer.
- Não tocar em `BU_SDRS` — Amanda continua como SDR de Modelo Atual.

**3. Banco — `closer_metas` (via tool de insert, não migration)**
- Inserir 12 linhas (Jan–Dez/2026) para `bu='modelo_atual'`, `closer='Thiago'`, `percentage=50`.
- Inserir 12 linhas (Jan–Dez/2026) para `bu='modelo_atual'`, `closer='Amanda Serafim'`, `percentage=50`.
- (Os percentuais reais são editáveis pelo Admin > Metas de Closers depois.)

### Pontos a confirmar antes de aplicar
- **Sobrenome do Thiago**: por enquanto fica `'Thiago'`. Quando confirmar, basta um pequeno rename no array + UPDATE em `closer_metas`.
- **Percentual inicial**: 50% para cada novo closer. Ajustes finos serão feitos via Admin.

### Fora de escopo
- Não altero `BU_SDRS` (Amanda permanece SDR também).
- Não altero `StructureTab.tsx` (estrutura visual da equipe — pode ser feito em request separado se quiser exibir lá).
- Não altero analytics hooks (`useModeloAtualAnalytics` etc.) — o filtro de closer já é dinâmico via `matchesCloserFilter` (partial match case-insensitive), funciona out-of-the-box.
