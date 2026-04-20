

User aprovou: ajustar `useModeloAtualMetas` para remover contaminação de "Start form" (Expansão) do indicador Leads do Modelo Atual.

## Ajuste do funil Leads — Modelo Atual

### Problema
O hook `useModeloAtualMetas` mapeia `'Start form': 'mql'` no `PHASE_TO_INDICATOR`. Como Leads = união de cards em fase Lead OU MQL, isso puxa 1.027 cards de Expansão/Franquia para o funil Modelo Atual, inflando Leads de ~1.030 para 2.048 em Abril/2026.

### Mudança
Em `src/hooks/useModeloAtualMetas.ts`:
- Remover `'Start form': 'mql'` do mapa `PHASE_TO_INDICATOR`.
- "Start form" não pertence ao pipe Modelo Atual — é fase de captura da Expansão.

### Resultado esperado
- Leads (Abril/2026) cai de ~2.048 para ~1.030.
- MQL, RM, RR, Proposta, Venda do Modelo Atual permanecem inalterados (não dependem de Start form).
- Funil Modelo Atual passa a refletir apenas cards do próprio pipe.

### Validação pós-mudança
Pedirei ao user para abrir Indicadores → Modelo Atual → Abril/2026 e confirmar que Leads ficou em ~1.030 e o funil agora está consistente (MQL ≤ Leads).

### Não vou
- Mexer em outras BUs (O2 TAX, Expansão, Oxy Hacker).
- Alterar lógica de MQL, deduplicação ou faixa de qualificação.

