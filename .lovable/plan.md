## Objetivo

No drill-down do velocímetro de **MQL** ("MQL - De Onde Vêm Nossos Melhores Leads?"), adicionar detalhamento **por canal de aquisição** com quantidade e % de cada canal.

## Alterações — `src/components/planning/IndicatorsTab.tsx` (case `'mql'`, ~linha 1911)

Usar o classificador já existente `classifyLeadSource` + `LEAD_SOURCE_LABELS` (Inbound / Outbound / Eventos / Indicação / Monetização / Sem origem).

1. **Contagem por canal**:
   ```ts
   const canalCounts = new Map<LeadSource, number>();
   items.forEach(i => {
     const s = classifyLeadSource({
       tipoOrigem: i.tipoOrigem, origemLead: i.origemLead,
       fonte: i.fonte, campanha: i.campanha, sdr: i.sdr,
     });
     canalCounts.set(s, (canalCounts.get(s) || 0) + 1);
   });
   const canalData = Array.from(canalCounts.entries())
     .map(([k, v]) => ({
       label: `${LEAD_SOURCE_LABELS[k]} (${((v/items.length)*100).toFixed(1)}%)`,
       value: v,
     }))
     .sort((a, b) => b.value - a.value);
   ```

2. **Novo chart** adicionado ao array `charts` (antes de "Por Faixa"):
   `{ type: 'bar', title: 'Por Canal de Aquisição', data: canalData }`

3. **Nova coluna "Canal"** na tabela (antes de "Data"):
   `{ key: 'canal', label: 'Canal' }`
   
   Enriquecer `items` antes de `setDetailSheetItems`:
   ```ts
   const itemsWithCanal = items.map(i => ({
     ...i,
     canal: LEAD_SOURCE_LABELS[classifyLeadSource({ ... })],
   }));
   ```

4. Adicionar `canal?: string` em `DetailItem` (`src/components/planning/indicators/DetailSheet.tsx`).

Escopo restrito ao case `'mql'`; MQLs cujo canal for "Sem origem" continuam sendo mostrados no gráfico/tabela.
