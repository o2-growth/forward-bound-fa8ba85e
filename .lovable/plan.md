## Objetivo

Fazer o MRR da aba **Operação** reagir ao filtro de **Data** (período/quarter), além de CFO e Produto que já funcionam.

## Diagnóstico

Hoje em `src/components/planning/CustomerSuccessTab.tsx`:

- `filteredClientes` (linha 210) → respeita só CFO + Produto.
- `filteredClientesPeriodo` (linha 225) → respeita CFO + Produto + Data (`dataAssinatura <= csEndDate`).
- `mrrBase` (linha 260) → soma de `filteredClientes.mrr` → **ignora a data**.
- `ChurnDossierSection` recebe `activeMrr={724400}` **hardcoded** (linha 511).
- `CfoView` recalcula `mrrTotal` a partir de `clientes` (prop) → respeita CFO/Produto, mas recebe `filteredClientes` (sem data).

## Mudanças

Arquivo único: `src/components/planning/CustomerSuccessTab.tsx`.

1. **`mrrBase`** — trocar fonte de `filteredClientes` para `filteredClientesPeriodo` para refletir a data selecionada (clientes ativos até o fim do período).

2. **ChurnDossierSection** — substituir o `activeMrr={724400}` hardcoded por `mrrBase` (que agora é a versão filtrada por data) e passar `filteredClientesPeriodo` em `activeClientesCount` e `activeClients` para coerência com o KPI exibido.

3. **CfoView** — passar `filteredClientesPeriodo` no lugar de `filteredClientes` para que `mrrTotal` por CFO, ticket médio, margem e simulador respeitem a data.
   - `clientes` da prop `CfoView` passa a ser `filteredClientesPeriodo`.

4. **VisaoGeralCS** — continuar recebendo `filteredClientesPeriodo` (já recebe). Apenas garantir que `mrrBase` (que vem por prop) agora é o valor por período.

5. **Tooltip do KPI "MRR Base"** em `VisaoGeralCS.tsx` (linha 197) — atualizar texto para deixar claro: "Soma (CFOaaS + OXY) de clientes ativos no fim do período selecionado. Respeita filtros de CFO, Produto e Data."

## Fora do escopo

- Reuniões, Alertas, Pipeline e a lista de Clientes continuam usando `filteredClientes` (snapshot atual), pois representam estado operacional do "agora" e não fazem sentido cortar por período histórico.
- NPS mantém sua lógica própria de período (não toca).

## Validação

- Trocar para Q1 com algum CFO específico → MRR Base, MRR Total por CFO e activeMrr do Churn devem mudar coerentemente.
- Limpar filtros → valor volta ao snapshot completo.
