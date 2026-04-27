## Objetivo

Adicionar, dentro do **Comparativo Semanal**, uma seção que mostra a **quantidade de Reuniões Marcadas (RM), Reuniões Realizadas (RR), Propostas e Vendas por SDR** no período selecionado.

## Onde aparece

Dentro do card "Comparativo Semanal" (que já é colapsável), abaixo dos cards de semanas e antes do gráfico de barras existente. Aparece quando o usuário expande o painel.

## O que mostra

Uma tabela compacta com uma linha por SDR e quatro colunas numéricas:

```text
| SDR              |  RM  |  RR  | Prop | Venda |
|------------------|------|------|------|-------|
| Carlos Ramos     |  18  |  12  |   7  |   2   |
| Carolina Boeira  |  15  |  10  |   5  |   1   |
| Marco Aurélio    |   9  |   6  |   3  |   1   |
| Pedro Albite     |   4  |   3  |   1  |   0   |
| Sem SDR          |   2  |   1  |   0  |   0   |
| **Total**        |  48  |  32  |  16  |   4   |
```

- Ordenação: por RM decrescente.
- Linha "Sem SDR" agrupa cards onde o campo SDR está em branco.
- Linha "Total" no rodapé.
- Período = período já selecionado no Comparativo Semanal (mesmo `startDate`/`endDate`).
- Respeita os filtros já ativos da aba Indicadores (BU, SDR, Closer) — pois usa o mesmo `itemsByIndicator` que o painel já recebe.

## Como o nome do SDR é resolvido

Para cada `DetailItem`, usa `item.sdr` quando existe; caso vazio, cai em `item.responsible`; caso ainda vazio, agrupa como "Sem SDR". Normaliza com `trim()` e ignora maiúsculas/minúsculas no agrupamento, mas mantém a forma original mais comum para exibição.

## Indicadores incluídos

Apenas RM, RR, Proposta e Venda (não inclui MQL/Lead, conforme pedido). Se algum desses indicadores não estiver presente em `indicatorConfigs` (por exemplo em uma BU que não rastreia proposta), a coluna correspondente é omitida.

## Implementação técnica

- **Arquivo único editado**: `src/components/planning/indicators/WeeklyComparison.tsx`.
  - Novo componente interno `SdrBreakdown` que recebe `itemsByIndicator` + período.
  - Filtra os itens de cada indicador pelo intervalo `[startDate, endDate]` (mesma lógica de `countItemsInWeek`).
  - Agrupa por SDR usando `Map<string, { rm, rr, proposta, venda }>`.
  - Renderiza como `<table>` estilizada com Tailwind (`text-sm`, bordas suaves, células `text-right`).
  - Inserido logo abaixo da grid de semanas, antes do `BarChart`.
- Sem novos arquivos, sem novas dependências, sem mudanças de tipos.

## O que NÃO muda

- Comportamento colapsável e título do card.
- Gráfico de barras agrupadas existente.
- Cards por semana acima.
- Filtros e período (controlados pela página `IndicatorsTab`).
