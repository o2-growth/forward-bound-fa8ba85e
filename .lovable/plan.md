## Objetivo

No Dossiê de Churn há dois ícones ✨ por linha. Como o cliente já caiu, a análise "360 do cliente ativo" não faz sentido aqui. Deixar **apenas um ✨ ao lado do nome**, abrindo a Análise IA do churn (post-mortem).

## Alterações

Arquivo: `src/components/planning/nps/ChurnDossierSection.tsx`

1. **Coluna Cliente** — remover o botão Sparkles que chama `setDrawerCliente(c)` (Cliente360). No lugar, colocar um botão Sparkles que chama `setAnalysisChurn(row)`, com tooltip "Análise IA do churn".

2. **Coluna de ações** — remover o botão Sparkles atual; manter só o `PipefyCardLink` "Ver card".

3. **Limpeza** (código que fica órfão):
   - Remover estado `drawerCliente` / `setDrawerCliente`.
   - Remover `clienteLookup` e `findCliente`.
   - Remover `<Cliente360Drawer>` no final do JSX.
   - Remover imports `Cliente360Drawer`, `JornadaCliente`.
   - Remover a prop `clientes` da interface `Props` e do destructuring.
   - Remover a passagem de `clientes={...}` no caller (`NpsTab.tsx` ou onde estiver).

## Resultado

Cada linha do dossiê passa a ter apenas:
- Nome do cliente · link Pipefy · ✨ (Análise IA do churn)
- Coluna de ações: apenas "Ver card"
