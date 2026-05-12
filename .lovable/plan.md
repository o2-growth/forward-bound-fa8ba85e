## Botão escondido para sincronizar Plan Growth → funnel_metas

### Visibilidade
Botão **renderizado apenas** quando a URL contém `?syncFunnel=1`. Invisível na navegação normal.

### Implementação (`MediaInvestmentTab.tsx`)
1. Detectar a flag:
   ```ts
   const showSyncBtn = typeof window !== 'undefined'
     && new URLSearchParams(window.location.search).get('syncFunnel') === '1';
   ```
2. Extrair o bloco já existente de sync (`buildItems` + `bulkUpsertFunnelMetas`) em `syncFunnelMetasFromPlanGrowth()`.
3. Renderizar botão (variant `outline`, ícone `RefreshCw`, label "Sincronizar metas com Indicadores") junto aos botões existentes de salvar/descartar, dentro de `{showSyncBtn && (...)}`.
4. `AlertDialog` de confirmação: "Sobrescrever metas de funil dos meses não lockados nos Indicadores Comercial?"
5. Ao confirmar: chama a função, toast com contagem, registra `logAction`.
6. `handleSaveAll` continua chamando a mesma função (sem regressão).

### Como usar
Acessar Plan Growth com `?syncFunnel=1` na URL → botão aparece → clicar → confirmar → Indicadores Comercial reflete Jun = 23 etc.

### Validação
- Sem query param: botão não aparece.
- Com `?syncFunnel=1`: botão visível → toast de sucesso → conferir Jun/2026 Modelo Atual = 23 nos Indicadores.
- Meses lockados permanecem inalterados.

### Arquivos afetados
- `src/components/planning/MediaInvestmentTab.tsx`
