# Fix: Oportunidades Quentes — separar colunas MRR, Setup e Pontual no drawer

## Diagnóstico
Verificação do card exibido (Agrovet — `1405995793`):

| Campo Pipefy | Valor no banco |
|---|---|
| Valor MRR | vazio |
| Valor Setup | R$ 10.644,00 |
| Valor Pontual | vazio |

O total `R$ 10.644` é **exatamente o Setup** — ou seja, o agregado já está somando MRR + Setup + Pontual corretamente (`itemRevenue` em `CommercialPaceDashboard.tsx` linha 77-80 e `value` em `IndicatorsTab.tsx` linha 3358). O que engana é a coluna única "Valor (MRR+Setup+Pontual)" no drawer, que não deixa ver que Setup entrou e MRR/Pontual estão zerados por falta de preenchimento no Pipefy.

## Mudança
Arquivo: `src/components/planning/IndicatorsTab.tsx` — bloco `onHotOpportunitiesClick` (linhas 3396-3402).

Substituir as colunas do drawer para mostrar a composição:

```ts
setDetailSheetColumns([
  { key: 'name', label: 'Empresa' },
  { key: 'bu', label: 'BU' },
  { key: 'phase', label: 'Fase Atual', format: columnFormatters.phase },
  { key: 'mrr', label: 'MRR', format: columnFormatters.currency },
  { key: 'setup', label: 'Setup', format: columnFormatters.currency },
  { key: 'pontual', label: 'Pontual', format: columnFormatters.currency },
  { key: 'value', label: 'Total', format: columnFormatters.currency },
  { key: 'responsible', label: 'Closer' },
  { key: 'date', label: 'Data Entrada', format: columnFormatters.date },
]);
```

Os campos `mrr`, `setup`, `pontual` já vêm preenchidos em `DetailItem` pelos `toDetailItem` de cada BU — não é preciso mexer nos hooks. O total continua = MRR + Setup + Pontual.

## Impacto
- Drawer de "Oportunidades quentes" passa a ter 4 colunas monetárias (MRR / Setup / Pontual / Total) + BU, tornando visível a composição de cada card.
- Nenhum cálculo agregado muda.
- Nenhuma outra tela é afetada.

## Arquivo alterado
- `src/components/planning/IndicatorsTab.tsx` (bloco de colunas do drawer, ~7 linhas)
