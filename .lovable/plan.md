## Objetivo

Gerar um arquivo `.xlsx` para conferência dos aceler\u00f4metros da aba **Indicadores Comerciais**, cobrindo o **\u00faltimo m\u00eas fechado** (Nov/2026, referente a `data de assinatura` para vendas e `data de cria\u00e7\u00e3o` para leads/MQL/RM/RR/Proposta), com o **funil completo** (Leads, MQL, RM, RR, Proposta, Venda), quebrado por **BU** e por **Origem**.

## Entreg\u00e1vel

Um \u00fanico arquivo em `/mnt/documents/conferencia-acelerometros-nov-2026.xlsx` com as seguintes abas:

1. **Consolidado** \u2014 piv\u00f4 BU \u00d7 Indicador (linhas = BU, colunas = Leads, MQL, RM, RR, Proposta, Venda), com linha de Total.
2. **Consolidado por Origem** \u2014 piv\u00f4 Origem \u00d7 Indicador, somando todas as BUs.
3. **Por BU** \u2014 uma aba por BU (Modelo Atual, O2 TAX, Franquia, Oxy Hacker, Outbound, Monetiza\u00e7\u00e3o): linhas = Origem, colunas = indicadores do funil.
4. **Detalhe por card** \u2014 linha por card contando pelo menos uma vez em algum indicador do m\u00eas, com colunas: `card_id`, `t\u00edtulo`, `empresa`, `BU`, `origem`, `fase atual`, `SDR`, `Closer`, `data cria\u00e7\u00e3o`, `data assinatura`, `MRR`, `Setup`, `Pontual`, `Valor total`, e flags bin\u00e1rias `is_lead`, `is_mql`, `is_rm`, `is_rr`, `is_proposta`, `is_venda`.

## Fonte de dados e regras (bater com o dashboard)

- Reaproveitar exatamente a mesma l\u00f3gica dos hooks j\u00e1 usados na aba: `useModeloAtualAnalytics`, `useO2TaxAnalytics`, `useExpansaoAnalytics` (Franquia + Oxy Hacker), `useOutboundAnalytics`, `useMonetizacaoAnalytics` \u2014 via consulta \u00e0 external DB do Pipefy pela edge function `query-external-db` (mesma rota que o app usa) para garantir n\u00fameros id\u00eanticos aos aceler\u00f4metros.
- Aplicar as regras que j\u00e1 est\u00e3o no c\u00f3digo/memory:
  - Dedup mensal por card + fase.
  - Venda deduplicada 1x por card+m\u00eas preferindo `Ganho` sobre `Contrato assinado`; Monetiza\u00e7\u00e3o s\u00f3 conta venda em `Conclu\u00eddo`.
  - MQL por faixa de faturamento (Modelo \u2265 200k, O2 TAX \u2265 500k, Expans\u00e3o \u2265 15k), independente da fase atual.
  - Exclus\u00e3o de test cards via `isTestCard`.
  - Origem via `src/lib/leadSource.ts` (inclui reclassifica\u00e7\u00e3o de G4 como Eventos e Monetiza\u00e7\u00e3o como origem pr\u00f3pria).
  - Normaliza\u00e7\u00e3o de strings (trim, lower, sem acento) para agrupar origens.

## Detalhes t\u00e9cnicos

- Rodar um script Node local que:
  1. Chama a edge function `query-external-db` autenticado com service role para puxar os cards de cada pipe do m\u00eas fechado.
  2. Aplica os mesmos aggregators (`temperaturaAggregator` n\u00e3o \u00e9 necess\u00e1rio; reutilizar as fun\u00e7\u00f5es puras de classifica\u00e7\u00e3o de `leadSource.ts` e as regras de dedup dos hooks portadas para um utilit\u00e1rio de export).
  3. Escreve o XLSX com `exceljs` (formata\u00e7\u00e3o num\u00e9rica BR, cabe\u00e7alho em negrito, freeze na primeira linha, filtro autom\u00e1tico na aba de detalhe).
- N\u00e3o alterar UI do app. Nenhum arquivo em `src/` mexido; script fica em `/tmp` e o arquivo final em `/mnt/documents/`.
- Ao final, entregar o arquivo via `<presentation-artifact>` para download.

## Fora de escopo

- N\u00e3o adiciona bot\u00e3o de export no dashboard (posso fazer depois se quiser recorrente).
- N\u00e3o inclui per\u00edodos al\u00e9m do \u00faltimo m\u00eas fechado.
