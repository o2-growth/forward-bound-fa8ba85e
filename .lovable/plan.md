## Auditoria de vazamento de dados para usuários com role `cfo`

Verifiquei todo o caminho de dados acessível a um CFO (que só vê a aba **Operação** / `CustomerSuccessTab`). Achei **2 vazamentos residuais** além do já corrigido em `operacao`:

### 1. Sub-aba NPS — filtro CFO destravado
`CustomerSuccessTab.tsx` linhas 510-525: o `NpsFilters` recebe `cfos={nfCfos}` (todos os CFOs) e `onCfosChange={(v) => setFilters({ cfos: v })}` sem `disabled`. Um CFO consegue:
- Ver a lista completa de nomes de CFOs no MultiSelect.
- Limpar a seleção e ver dados de NPS de todos (mesmo que o `useEffect` lock-in reaplique depois, dá flicker e a query reativa).

**Fix:** passar `lockedCfo` para `NpsFilters` — quando ativo: opções restritas a `[lockedCfoName]`, `disabled`, sem `X` para remover o badge, e `onClear` preserva o cfo lock. Mesmo padrão da barra principal (linhas 369-387).

### 2. CfoView e ChurnDossierSection — `churnDossier` cru
`CustomerSuccessTab.tsx` linhas 498-499 e 581-582 passam `opsData?.churnDossier` cru para `CfoView` e `ChurnDossierSection`.

- `ChurnDossierSection` já filtra internamente por `globalCfos` (linha 114), **mas** o dropdown "Motivos" (linha 99) é construído a partir do `data` cru → expõe ao CFO o universo de motivos de churn dos outros CFOs.
- `CfoView` agrega `churnDossier` por CFO; a tabela só mostra a linha do usuário (porque `cfos` está filtrado), mas o payload com todos os clientes churnados de outros CFOs **chega no bundle do cliente** (defesa em profundidade — visível via devtools).

**Fix:** criar um `filteredChurnDossier` memoizado em `CustomerSuccessTab` que aplica `filters.cfos` ao array antes de passar para ambos os componentes. Comportamento para admin (`filters.cfos = []`) inalterado.

### Itens verificados e OK
- `ClientesView`, `ReunioesView`, `AlertasView`: recebem listas já filtradas (`filteredClientes`, `filteredReunioes`, `filteredAlertas`).
- `OperacaoKpisStrip` e `VisaoGeralCS`: agora recebem `filteredOperacao` (fix do turno anterior).
- `useUserPermissions`: CFO só tem `allowedTabs = ['cs']`. NpsTab, IndicatorsTab, Financial, Admin: inacessíveis.
- RLS: `profiles` admin-only; `user_roles` admin-only; `cfo_user_mapping` filtrado por `auth.uid()`. OK.
- `filteredNpsData` (NPS): respeita `filters.cfos` (linha 133-138). OK uma vez que o filtro esteja travado.

## Arquivos alterados

1. **`src/components/planning/CustomerSuccessTab.tsx`**
   - Adicionar memo `filteredChurnDossier` (filtra por `filters.cfos` no campo `cfo`).
   - Trocar `opsData?.churnDossier` por `filteredChurnDossier` nas duas passagens (`CfoView` e `ChurnDossierSection.data`).
   - Passar `lockedCfo` (computado de `isCfo && lockedCfoName`) para `NpsFilters` e ajustar callbacks (`onCfosChange` no-op quando travado; `onClear` mantém o cfo).

2. **`src/components/planning/nps/NpsFilters.tsx`**
   - Aceitar prop opcional `lockedCfo?: string | null`.
   - Quando definido: `cfoOptions = [{label: lockedCfo, value: lockedCfo}]`, `disabled` no MultiSelect, esconder X do badge correspondente.

Nenhuma mudança de RLS / Edge Function / schema.
