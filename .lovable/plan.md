## Objetivo
1. Fazer backup completo (Snapshot SQL + CSV) da tabela `funnel_metas` antes de qualquer alteração.
2. Implementar a sincronização Plan Growth → `funnel_metas` para que os meses **não lockados** reflitam automaticamente as metas calculadas no Plan Growth dentro dos Indicadores Comercial.

---

## Etapa 1 — Backup (executar PRIMEIRO)

### 1a. Snapshot no banco
Criar tabela `funnel_metas_backup_20260512` como cópia integral da `funnel_metas` atual:
```sql
CREATE TABLE public.funnel_metas_backup_20260512 AS
SELECT * FROM public.funnel_metas;
```
- Permite reverter qualquer linha via `UPDATE ... FROM funnel_metas_backup_20260512`.
- Permanece no banco até deleção manual.

### 1b. Export CSV
Gerar `/mnt/documents/funnel_metas_backup_20260512.csv` com todo o conteúdo da tabela e disponibilizar como artifact para download.

> ⚠️ Nada da Etapa 2 começa antes do backup confirmado.

---

## Etapa 2 — Sincronização Plan Growth → funnel_metas

### 2a. `MediaInvestmentTab.tsx` (handleSaveAll)
Após o `bulkUpdateMetas.mutateAsync` (que grava `monetary_metas`), adicionar **segunda etapa**:
- Para cada BU (`modeloAtualFunnel`, `o2TaxFunnel`, `oxyHackerFunnel`, `franquiaFunnel`):
  - Iterar pelos 12 meses calculados.
  - **Pular** meses cujo `is_locked = true` no `funnel_metas` atual.
  - Montar payload com: `leads`, `mqls`, `rms`, `rrs`, `propostas`, `vendas` (todos arredondados).
  - **NÃO** tocar em `faturamento_meta`, `mrr_base_planejamento`, `faturamento_vender`, `investimento` (preservados pelos fluxos existentes).
- Chamar `bulkUpsert.mutateAsync(payload)` do `useFunnelMetas`.
- Em sucesso: `queryClient.invalidateQueries({ queryKey: ['funnel-metas', 2026] })` para Indicadores recarregar.

### 2b. `useFunnelMetas.ts` (proteção extra contra lock)
No `bulkUpsert`, antes do `upsert`, filtrar `items` removendo qualquer combinação `(bu, month, year)` que já esteja `is_locked = true` na lista carregada (`funnelMetas`). Defesa em profundidade — mesmo se um chamador esquecer, o hook respeita o lock.

### 2c. Toast de feedback
Mensagem "Metas do funil sincronizadas com Indicadores Comercial" após sucesso, distinguindo de salvamento monetário.

---

## Validação manual
- Backup: confirmar tabela `funnel_metas_backup_20260512` criada e CSV baixável.
- Abrir Plan Growth → Mai/Jun (não lockados) mostram X vendas.
- Alterar ticket médio → recalcula em tela.
- Clicar "Salvar Todas".
- Abrir Indicadores Comercial → filtro Jun/2026 + Modelo Atual → meta de vendas = valor exibido no Plan Growth (ex.: 23, não mais 31).
- Lockar Mai → alterar parâmetro → salvar → Mai permanece inalterado em Indicadores; Jun atualiza.

## Reversão (se necessário)
- Código: botão revert da mensagem do chat.
- Dados: `UPDATE funnel_metas SET ... FROM funnel_metas_backup_20260512 WHERE ...` (ou re-importar o CSV).

## Arquivos afetados
- `src/components/planning/MediaInvestmentTab.tsx` (handleSaveAll)
- `src/hooks/useFunnelMetas.ts` (filtro lock no bulkUpsert)
- 1 migration (criação da tabela backup)
- 1 export CSV em `/mnt/documents/`

Sem mudanças em Edge Functions, RLS ou auth.
