# Drill-down "Performance de Closers por Faixa" no Rank Closers

Cria um modal que abre ao clicar em qualquer linha do card **Rank Closers (vs Meta)** em Indicadores › Comercial, reproduzindo o layout do HTML enviado com dados reais do dashboard (respeitando os filtros ativos de BU, período, SDR, etc.).

## Arquivos

### 1. `src/components/planning/indicators/CloserPerformanceMatrix.tsx` (novo)
Modal (`Dialog` do shadcn) com o layout de referência:
- **KPI tiles** (um por closer): total de Reuniões, Vendas, % Conversão, contratos em elaboração.
- **Tabela matriz** — linhas = faixas de faturamento (normalizadas via `normalizeTier` de `src/lib/revenueTiers.ts`), colunas agrupadas por closer + coluna "Equipe" com Reuniões / Vendas / % Fechamento e mini barra de progresso.
- **Bloco "Contratos em elaboração"** — lista cards da fase `Contrato em elaboração` (já mapeada em `useModeloAtualAnalytics` / `useO2TaxAnalytics`) por closer, com projeção do "se todos fecharem".
- Rodapé com critérios (Reunião = card em Reuniões Realizadas; Venda = Ganho + Contrato assinado; Contrato em elaboração exibido separado).

Props: `open`, `onClose`, `itemsByIndicator` (o mesmo já usado em `PersonRanking`), `elaboracaoItems` (novo — ver item 3), `highlightCloser?: string` para dar destaque visual quando o usuário clicou numa linha específica.

Cálculo interno:
- `reunioes[closer][tier]` = itens de `itemsByIndicator['rr']` no período, agrupados por `firstNameKey(item.closer)` × `normalizeTier(item.revenueRange)`.
- `vendas[closer][tier]` = itens de `itemsByIndicator['venda']` (mesma lógica).
- `%` = vendas ÷ reuniões (— quando reuniões = 0).
- Totais por closer, por faixa e geral.

### 2. `src/components/planning/indicators/PersonRanking.tsx` (editar)
- Adicionar prop opcional `onRowClick?: (closerName: string) => void`.
- Quando `role === 'closer'` e `onRowClick` existir, tornar a `<tr>` clicável (`cursor-pointer`) e disparar o callback.
- Sem mudanças no cálculo existente.

### 3. `src/components/planning/IndicatorsTab.tsx` (editar)
Nas duas ocorrências do `<PersonRanking role="closer" …>` (Rank Closers em Comercial):
- Estado local `closerDrillOpen` + `closerDrillHighlight`.
- Passar `onRowClick={(name) => { setCloserDrillHighlight(name); setCloserDrillOpen(true); }}`.
- Renderizar `<CloserPerformanceMatrix open={…} onClose={…} itemsByIndicator={…} elaboracaoItems={…} highlightCloser={…} />`.
- `elaboracaoItems`: extrair da mesma agregação que já monta `itemsByIndicator`, filtrando cards cuja fase atual seja "Contrato em elaboração" (fase já existente nos hooks Modelo Atual / O2 TAX).

## Fora de escopo

- Nada em `useModeloAtualAnalytics` / `useO2TaxAnalytics` / banco: reutiliza `itemsByIndicator` já calculado.
- Sem alteração no card SDR nem em outras abas.
- Sem endpoint novo, sem migração.

## Validação

- Filtrar consolidado → abrir Rank Closers → clicar em qualquer linha → modal deve abrir com números coerentes: soma da coluna "Equipe" deve bater com o total de RR e Vendas dos gauges do topo.
- Trocar filtro para uma BU específica → totais no modal devem refletir só aquela BU.
- Fechar e reabrir → estado limpo.
