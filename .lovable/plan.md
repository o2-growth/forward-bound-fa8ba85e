## Diagnóstico

O card **"Overview histórico"** (CEO › Comercial) usa `useFunnelRealized` — que lê a tabela `funnel_realized` (sync do Google Sheets/Pipefy por fase). Já a tabela **"Funil — realizado x meta"** logo abaixo usa os analytics reais (`useModeloAtualAnalytics`, `useO2TaxAnalytics`, `useExpansaoAnalytics`, `useOutboundAnalytics`) — com regras de MQL por faturamento, dedup mensal de venda, exclusão de test cards, `Data de assinatura` etc.

São duas fontes diferentes, então os números divergem — especialmente no "último mês", onde `funnel_realized` costuma estar atrasado/parcial e não aplica as regras de MQL/venda que valem na aba Indicadores Comercial.

## Correção em `src/components/planning/ceo/ComercialSection.tsx`

1. **Remover a linha "Leads"** do overview histórico (`FUNNEL_STAGES` continua igual para o funil principal — criar um `OVERVIEW_STAGES` local sem `leads`: MQLs, Reuniões agendadas, Reuniões realizadas, Propostas, Vendas).
2. **Trocar a fonte** do overview de `useFunnelRealized` para os mesmos analytics hooks que a tabela do funil usa. Instanciar cada hook para as 3 janelas (último mês, últimos 3 meses, MTD) somando as 5 BUs (`modeloAtual + o2tax + franquia + oxyHacker + outbound`) via `getCardsForIndicator(ind).length` — exatamente o padrão do `useMemo` do `funil` atual.
3. **Projeção do mês**: manter a fórmula `MTD × (diasDoMês / diasDecorridos)`, mas agora aplicada em cima dos valores dos analytics.
4. **Coluna "Meta"** (opcional, mas ajuda o usuário validar): adicionar coluna de meta do último mês fechado somando `funnelMetas.getFunnelForBU(bu)` para o mês/ano correspondente, com a mesma lógica já existente no `useMemo` do funil — assim fica visível que Reuniões Agendadas/Realizadas batem com o que aparece em Indicadores Comerciais.
5. Remover o texto "não responde ao filtro de período acima" (fica igual, mas explicitar que a fonte agora é a mesma do funil abaixo).

### Detalhes técnicos

- Novas chamadas de hooks no topo do componente (ordem estável): `useModeloAtualAnalytics(lastMonthStart, lastMonthEnd)`, `...(last3Start, last3End)`, `...(mtdStart, hoje)` e análogos para O2 TAX, Franquia, Oxy Hacker, Outbound. São 15 hooks extras — mesmo padrão dos hooks já existentes na aba.
- Helper local `sumStage(stage, hooks[])` recebe o array das 5 BUs de uma janela e retorna `Σ getCardsForIndicator(stage).length`.
- Remover imports e chamadas de `useFunnelRealized` do arquivo (não é mais usado em lugar nenhum aqui).
- Atualizar o `AiNote`/subtítulo do card para dizer "mesma fonte da aba Indicadores Comercial".

## Validação

Comparar, na aba CEO › Comercial:
- Coluna "Mês atual (até hoje)" para MQLs, Reuniões agendadas, Reuniões realizadas, Propostas, Vendas deve bater exatamente com os totais mostrados na aba **Indicadores Comercial** com o filtro de período em "mês atual".
- Coluna "Último mês" deve bater com Indicadores Comercial filtrando o mês anterior fechado.
- A linha "Leads" desaparece do overview.