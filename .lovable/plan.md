# Relatórios de conferência dos acelerômetros

Objetivo: gerar planilhas Excel que permitam bater, célula a célula, os números que aparecem nos acelerômetros (MQL, Reunião Marcada, Reunião Realizada, Proposta Enviada, Venda) contra a fonte bruta no Pipefy — quebrados por **BU** e por **Origem** (as mesmas origens mapeadas em `src/lib/leadSource.ts`, incluindo Eventos→G4 e Funil de Monetização).

## O que vai ser entregue

Um script/edge que gera **um arquivo Excel por estágio do funil**, mais um arquivo consolidado. Cada relatório tem o mesmo formato, então dá pra comparar linha a linha com o dashboard.

### Arquivos gerados (em `/mnt/documents/`)

1. `conferencia-mql-{periodo}.xlsx`
2. `conferencia-reuniao-marcada-{periodo}.xlsx`
3. `conferencia-reuniao-realizada-{periodo}.xlsx`
4. `conferencia-proposta-enviada-{periodo}.xlsx`
5. `conferencia-venda-{periodo}.xlsx`
6. `conferencia-consolidado-{periodo}.xlsx` (pivot BU × Origem × Estágio)

### Estrutura de cada arquivo por estágio

- **Aba `Resumo`**: matriz BU (linhas) × Origem (colunas) com contagem; total por linha/coluna; comparação com o número exibido no dashboard (coluna "Dashboard" preenchida manualmente ou puxada do snapshot).
- **Aba `Detalhe`**: uma linha por card com — `card_id`, `título`, `BU`, `Origem detectada`, `Data do evento` (data de criação para MQL; data de movimento para RM/RR/Proposta; data de assinatura para Venda), `Fase atual`, `Closer`, `SDR`, `MRR`, `Setup`, `Pontual`, `Motivo qualificação MQL` (para MQL: threshold atingido / faturamento declarado), `URL Pipefy`.
- **Aba `Metodologia`**: descreve a fonte (`pipefy_cards`, `pipefy_cards_movements`, `pipefy_cards_movements_expansao`, `pipefy_moviment_outbound`, `pipefy_moviment_contrato`), a regra de dedup (1× por card × fase × mês; venda prefere "Ganho"), os thresholds de MQL (Modelo ≥ R$ 200k, O2 TAX ≥ R$ 500k, Expansão ≥ R$ 15k), exclusão de test cards e a lógica de classificação de origem espelhada do `leadSource.ts`.

## Como funciona

- **Fonte**: mesma DB externa que os hooks já usam (`useModeloAtualAnalytics`, `useO2TaxAnalytics`, `useExpansaoAnalytics`, `useOutboundAnalytics`, `useMonetizacaoAnalytics`) — via edge function `query-external-db` para respeitar JWT/RLS.
- **Classificação de origem**: reaproveita `src/lib/leadSource.ts` + `src/lib/eventSubcategory.ts` para garantir que a origem no relatório é idêntica à do dashboard (inclui a regra de qualquer sinal "g4" cair em Eventos).
- **Estágios**:
  - MQL: entrada em "MQLs" (Modelo Atual/Expansão) ou qualificação por faturamento (thresholds), data = criação do card.
  - RM: entrada em "Reunião marcada".
  - RR: entrada em "Reunião realizada".
  - Proposta: entrada em "Proposta enviada".
  - Venda: entrada em "Ganho" ou "Contrato assinado" (dedup preferindo Ganho); para Monetização apenas fase "Concluído".
- **Dedup**: 1 contagem por card × fase × mês, alinhado com `funnel-deduplication-rules-v2`.
- **Test cards**: excluídos via `isTestCard`.

## Interface de geração

Duas opções — escolha na sua próxima mensagem:

**A) Botão no app (aba Indicadores Comerciais)**
- Novo botão "Exportar conferência" abre modal para escolher período (mês fechado, MTD, custom) e estágios desejados.
- Chama edge function `export-acelerometros-report` que gera os `.xlsx` e retorna links de download (upload em Supabase Storage bucket `reports`).
- Vantagem: qualquer usuário com permissão gera; período flexível; auditável.

**B) Script offline sob demanda**
- Você pede no chat ("gera pro mês X"), eu rodo o script Python (evolução do `/tmp/gen_report.py`) e entrego os arquivos em `/mnt/documents/`.
- Vantagem: zero mudança no app; rápido de iterar.

## Detalhes técnicos

- Reuso do agregador: extrair a lógica de classificação/contagem em `src/lib/reportAggregator.ts` (compartilhado entre hooks React e edge function via módulo Deno equivalente).
- Período: parametrizado `{start, end}` — default = último mês fechado.
- Formatação Excel: openpyxl, cabeçalhos em negrito, moeda `R$ #,##0`, coluna "URL Pipefy" como hyperlink.
- O2 TAX: nota na aba Metodologia sobre defasagem de dados da réplica (movements até mai/2026) — mesma limitação do relatório anterior; preciso confirmar se a fonte agora está atualizada.

## Perguntas antes de implementar

1. Opção **A (botão no app)** ou **B (sob demanda pelo chat)**?
2. Período default: **mês fechado anterior** ou **MTD**?
3. Incluir aba com **comparação lado-a-lado vs. valor do dashboard** (exige snapshot salvo) ou basta o detalhe bruto para você conferir manualmente?
