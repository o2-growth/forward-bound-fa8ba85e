
## Causa raiz

Hoje, no `IndicatorsTab.tsx` (helper `getLockedDbFunnelValue`), a meta de funil (Vendas, Propostas, RM, RR, MQL, Leads) lida do banco **só é usada quando o mês está `is_locked=true`**. Para meses **não-lockados**, o KPI cai no `funnelData` ao vivo do `MediaMetasContext`, que é recalculado em tempo real pelo `MediaInvestmentTab` a partir de MRR Base + A Vender + ticket médio.

Resultado: quando o "Sync → Indicadores" grava `vendas=23` em `funnel_metas` para Jun/2026 (Modelo Atual), o DB fica com 23, mas o KPI de Vendas em Indicadores continua mostrando o valor recalculado ao vivo (30) porque Junho não está lockado. Plan Growth pode mostrar 23 quando o usuário viu, mas a próxima recomputação (mudança em MRR Base real, refetch do Oxy, ticket etc.) gera 30 — e os dois deixam de bater.

Confirmação no banco:
- `funnel_metas` Modelo Atual Jun/2026 → `vendas=23, is_locked=false`
- `funnel_metas` Modelo Atual Mar/2026 → `vendas=30, is_locked=true`

O comportamento correto é: **depois de sincronizar, Indicadores deve refletir exatamente o que está em `funnel_metas`**, mesmo para meses não-lockados.

## Mudança proposta

### 1. `src/components/planning/IndicatorsTab.tsx`

Renomear/refatorar `getLockedDbFunnelValue` para `getDbFunnelValue` e remover a checagem `is_locked === true`. A função passa a retornar o valor do DB sempre que existir uma linha em `funnel_metas` para aquele BU+mês+ano, independente do lock. Atualizar os dois callers internos (`calcularMetaDoPeriodo` e `getMonthlyMetasFromFunnel`) para usar o novo nome — a lógica de fallback para `funnelData` ao vivo é mantida apenas quando a linha não existe (cenário inicial, antes do primeiro sync).

Indicadores afetados: `leads`, `mql`, `rm`, `rr`, `proposta`, `venda`. Modelo Atual, O2 TAX, Oxy Hacker e Franquia.

### 2. `src/components/planning/MediaInvestmentTab.tsx` (handler `handleManualSyncFunnel`)

Após `bulkUpsertFunnelMetas.mutateAsync(...)`, invalidar explicitamente as queries que alimentam Indicadores para forçar refetch imediato sem precisar recarregar a página:

- `['funnel-metas', 2026]` (já é invalidada pelo `onSuccess` do hook)
- garantir que o toast de sucesso só apareça depois do refetch concluído (`await queryClient.refetchQueries({ queryKey: ['funnel-metas', 2026] })`).

### 3. Validação

- Visitar Plan Growth, clicar "Sync → Indicadores" no botão escondido (`?syncFunnel=1`).
- Conferir no banco que `funnel_metas` Modelo Atual Jun/2026 = 23.
- Abrir Indicadores Comercial → filtro Modelo Atual, período Junho.
- KPI "Vendas" deve mostrar **meta = 23** (não mais 30).
- Repetir para outros indicadores (RM, RR, Proposta) e meses não-lockados — todos devem bater com o DB.
- Meses lockados (Jan-Mai) continuam exibindo o snapshot lockado, sem mudança de comportamento.

### Arquivos afetados

- `src/components/planning/IndicatorsTab.tsx` — refatorar helper e callers
- `src/components/planning/MediaInvestmentTab.tsx` — refetch explícito após sync

Sem mudanças em DB, hooks ou edge functions.
