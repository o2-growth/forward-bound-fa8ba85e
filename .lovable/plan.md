
## Diagnóstico — Francisco Carlos (ID 1367018386)

Confirmei no banco: **um único card** com 3 movimentações para "Reunião Realizada" em julho:

| Data | Fase | Produto |
|---|---|---|
| 01/07 19:42 | Reunião Realizada | **Franquia** |
| 02/07 20:19 | Reunião Realizada | **Oxy Hacker** |
| 06/07 20:46 | Reunião Realizada | **Oxy Hacker** |

O card **mudou de produto** (Franquia → Oxy Hacker) durante o mês.

## Por que aparece múltiplas vezes

`useExpansaoAnalytics` é instanciado **duas vezes** no `IndicatorsTab`: uma para `Franquia`, outra para `Oxy Hacker`. Cada instância:

1. Filtra `cards`/`fullHistory` por `parsed.produto === produto`.
2. Aplica dedup mensal `(cardId, indicator, monthKey)` **dentro do seu produto**.

Resultado para Francisco Carlos em jul/2026:
- Instância **Franquia** → vê 1 movimentação RR (01/07) → conta **1**.
- Instância **Oxy Hacker** → vê 2 movimentações RR, dedup mensal colapsa → conta **1**.

O funil consolidado soma: `1 (Franquia) + 1 (Oxy Hacker) = 2` RRs para o mesmo card.

**Como chega a 4:** existem chamadas separadas que somam de novo os detail items em outros pontos da tela (drill-down "Consolidado" vs. barras por BU, ou repetição no chart de reuniões vs. funil clicável) — cada instância aparece 1x por lugar. Preciso confirmar qual bloco da tela é o que você viu com "4x" (drill-down, chart, tabela?) para ter certeza da origem exata.

## Correção proposta

Introduzir **dedup por card + mês cross-product** para os indicadores de reunião/proposta/venda em Expansão. Um card não deveria contar mais de 1 vez por mês, independente do produto atual — a "reunião realizada" é um evento único no ciclo de vida do card.

### Estratégia

1. Elevar a atribuição de produto de **movimentação-a-movimentação** para **produto do card no momento do evento contado**. Após dedup mensal por card+indicador, atribui-se ao produto da entry vencedora (earliest RR).
2. Cada card só passa por **uma** das duas instâncias (Franquia OU Oxy Hacker), definido pelo produto da earliest RR (ou earliest MQL/RM/proposta/venda) do card naquele mês.
3. Ajuste concentrado em `src/hooks/useExpansaoAnalytics.ts`:
   - `cards` continua filtrado por produto para MQL/leads (o produto no momento da criação faz sentido).
   - `monthlyFirstEntries` passa a ser construído a partir do **fullHistory sem filtro de produto** (compartilhado), mas cada entry carrega seu `produto`. O consumer decide qual instância "adota" o card.
   - `getCardsForIndicator(indicator)` para `rm/rr/proposta/venda` filtra as entries dedup'adas pelo produto da entry (`entry.produto === produto`).

Efeito: Francisco Carlos aparece 1x em Oxy Hacker (dono da earliest RR em jul: 02/07 20:19 caiu depois de 01/07 Franquia — então **1x em Franquia**, produto da earliest RR). Total consolidado = 1.

### Alternativa mais simples

Se o comportamento desejado for "card conta 1x por produto por mês" (aceita duplicação Franquia+OxyHacker no consolidado): remover a duplicação apenas na camada de agregação do consolidado (ClickableFunnelChart + IndicatorsTab), fazendo `Set<cardId>` cross-instance antes de somar. Cada BU individual continua vendo o card no seu produto.

## Pergunta

Qual comportamento você prefere?

1. **Dedup total** — card conta 1x no mês, no produto da **primeira RR** (não aparece nas duas BUs). *Mais correto conceitualmente; alinha com "throughput = evento único".*
2. **Dedup por produto** — card conta 1x em cada BU onde teve RR no mês, mas o consolidado deduplica para 1. *Mantém a visão por produto informativa.*

E confirme: onde exatamente você viu "4x"? (drill-down do card RR, gráfico de barras de reuniões, tabela de detalhes?) Isso ajuda a garantir que a correção atinge o ponto certo.
