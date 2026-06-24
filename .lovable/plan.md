
## Contexto — 3 problemas a corrigir na aba **Operação**

### 1. Salários (Custo Squad) na aba **CFO**
O custo real por squad já é calculado pelo hook `useSquadCostFromDre` (drill-down do DRE Oxy por CNPJ/CPF/alias). Hoje:
- Em `CustomerSuccessTab` o `CfoView` **recebe** `dateRange={ from: csStartDate, to: csEndDate }` ✅
- Em `CfoView` o hook usa esse range corretamente. ✅
- **Bug real:** o valor real é mesclado por uma variável **módulo-level** (`SQUAD_REAL_BY_PERSON`) atualizada dentro de um `useMemo`. Como `useMemo` não é garantido para side-effects e o cache é global ao módulo, em montagens/desmontagens (ou quando outro componente lê primeiro) o `matchedByPessoaNome` chega vazio e os helpers caem no fallback hardcoded — o que dá a sensação de “não está puxando da Oxy / não muda quando troco o mês”.
- Além disso, `matchedByPessoaNome` só vincula a pessoa quando o **label do fornecedor** no DRE Oxy tem CPF/CNPJ no texto OU existe alias em `dre_supplier_alias`. Quando o label vem só com o nome da empresa, não há match → cai para hardcoded silenciosamente.

### 2. **Entregas → Onboarding atrasado** sempre vazio
- `useJornadaData` já produz `onboardingAtrasado` corretamente (Kick-off / Primeiras Entregas - Diagnóstico cruzado com Central de Projetos).
- `CustomerSuccessTab` repassa para `ReunioesView` ✅, mas filtra por `filters.cfos` no `filteredOnboardingAtrasado`.
- **Bug provável:** `c.cfo` em `onboardingAtrasado` é gerado a partir de `row['CFO Responsavel']` do pipe **Gestão de Rotinas CFO**, que muitas vezes está vazio ou com nome diferente do filtro do CustomerSuccessTab. Quando o filtro está em "Todos" também aparece vazio → o `activeOnboardingTitles` (clientes em fase "Onboarding" em Central de Projetos) pode estar zerado se nenhum cliente está com `Fase Atual === 'Onboarding'` no momento (a regra hoje exige `row['Fase'] === row['Fase Atual']`, o que descarta linhas históricas — pode estar dropando 100% das linhas).

### 3. **Visão Geral CS vs aba CFO** mostram números diferentes para o mesmo CFO
- `VisaoGeralCS` faz `clientesByCfo` em cima de `activeClientes` (filtra só `INACTIVE_PHASES` no estado atual e usa `c.mrr` atual).
- `CfoView` re-agrega usando `clientesPeriodo` (snapshot do **fim do período selecionado** considerando data de assinatura e data oficial de churn).
- Resultado: bases diferentes → contagens e MRR diferentes por CFO.

---

## Plano

### Etapa A — Salários reais por mês (aba CFO)
1. **Remover** o cache módulo-level `SQUAD_REAL_BY_PERSON` e a `useMemo` com side-effect em `CfoView.tsx`.
2. Passar `squadCost.matchedByPessoaNome` por **contexto/closure**: criar um `Map` local com `useMemo([matchedByPessoaNome])` e refatorar `resolvePerson / getSquadParts / getSquadCusto / getSquadBeneficios / getAnalystCount` para receberem esse map como parâmetro (ou virarem closures dentro do componente). Isso garante reatividade real ao trocar `csStartDate/csEndDate`.
3. Adicionar um pequeno indicador visual no header da tabela CFO ("Custo real Oxy DRE • Mar/2026 • N pessoas mapeadas / total") usando contagem do `matchedByPessoaNome` para deixar claro quando o valor é real vs. fallback hardcoded.
4. Verificar que `useSquadCostFromDre` está sendo invalidado ao mudar `start/end` — já está (`queryKey` inclui datas). Sem alterações no hook.

### Etapa B — Onboarding atrasado em Entregas
1. Em `useJornadaData` (bloco onboardingAtrasado, linhas ~1018–1071):
   - **Relaxar** o gate `row['Fase'] === row['Fase Atual']`. Esse campo `Fase` vem do movement log; a fase atual já está em `Fase Atual`. Trocar por: usar **a linha mais recente por `ID` em `rotinas`** (mesmo padrão de dedup já usado nos hooks de analytics) e descartar o filtro redundante.
   - **Fallback do cruzamento com Central de Projetos:** se `activeOnboardingTitles` estiver vazio (zero clientes em "Onboarding" na Central), não bloquear todos — manter o card desde que a fase no pipe Rotinas seja Kick-off / Primeiras Entregas - Diagnóstico (a regra original já é específica o suficiente). Logar `console.warn` se essa branch disparar.
2. Em `CustomerSuccessTab`, no `filteredOnboardingAtrasado`: quando o card não tem `cfo` populado, **não excluir** se o filtro estiver em `all`; quando há filtro de CFO específico, manter exclusão.
3. Garantir tooltip do bloco já explica a regra.

### Etapa C — Alinhar Visão Geral CS com aba CFO
Definir a **fonte única**: usar `clientesPeriodo` (snapshot do fim do período selecionado) tanto na aba CFO quanto em VisaoGeralCS.

1. Em `CustomerSuccessTab`, já existe `filteredClientesPeriodo` (linha ~257). Passar essa lista (em vez do `clientes` cru) para `VisaoGeralCS` no prop `clientes`.
2. Em `VisaoGeralCS`, `clientesByCfo` continuará funcionando, mas agora sobre o **mesmo snapshot** usado por `CfoView`. Adicionar tooltip explicando "Snapshot do fim do período: dd/mm/aaaa".
3. Como sanity check, no card "Clientes Ativos" da Visão Geral também usar `activeClientes` derivado do snapshot (já que `INACTIVE_PHASES` é aplicado dentro do componente).

---

## Arquivos a alterar

```text
src/components/planning/jornada/CfoView.tsx          (Etapa A — refatorar helpers e remover cache global)
src/hooks/useJornadaData.ts                          (Etapa B — relaxar dedup e gate de Central de Projetos)
src/components/planning/CustomerSuccessTab.tsx       (Etapa B + C — filtro CFO permissivo + clientes snapshot)
src/components/planning/cs/VisaoGeralCS.tsx          (Etapa C — tooltip e leitura do snapshot)
```

Sem mudanças em edge functions, migrations ou hooks de dados (`useSquadCostFromDre` já está correto).

## Validação manual após implementar
- Trocar período em Operação (ex.: Fev → Mar/2026) e ver o "Custo Squad" mudando na tabela CFO.
- Verificar pelo menos 1 CFO em que o valor difere do hardcoded (indicador "X/Y pessoas mapeadas" > 0).
- Abrir aba "Entrega" e ver os cards atrasados de Kick-off e Primeiras Entregas - Diagnóstico aparecendo.
- Comparar a contagem de clientes e MRR por CFO entre "Visão Geral" e a aba "CFO" — devem bater linha a linha.
