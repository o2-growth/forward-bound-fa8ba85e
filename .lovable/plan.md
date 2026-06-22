## O que mudar

No drill-down do acelerômetro **Propostas Enviadas** (em `src/components/planning/IndicatorsTab.tsx`, case `'proposta'` por volta da linha 2060–2075), adicionar a coluna **Fase Atual** nas duas variações de tabela (Expansão e não-Expansão), logo após **Empresa**:

```ts
{ key: 'phase', label: 'Fase Atual', format: columnFormatters.phase }
```

Os cards já carregam `phase` (preenchido por `toDetailItem` em `useModeloAtualAnalytics` / `useExpansaoAnalytics` / `useO2TaxAnalytics` com `PHASE_DISPLAY_MAP[faseAtual]`), então é só expor a coluna — nenhum recálculo necessário.

## Arquivo afetado

- `src/components/planning/IndicatorsTab.tsx` (apenas o bloco do drill-down de Proposta)
