## Objetivo

Aplicar override por código no card "Ashia Andrade" para que apareça como **Oxy Hacker** com valor de **R$ 32.000**, em vez de Franquia (que é como está classificado no Pipefy hoje).

## Abordagem

Criar um mapa centralizado de exceções (`CARD_OVERRIDES`) no hook `useExpansaoAnalytics.ts`, indexado pelo **ID do card no Pipefy**, que sobrescreve `produto` e/ou valores monetários (`taxaFranquia`, `valorMRR`, `valorSetup`, `valorPontual`) na função `parseRawCard`.

Assim:
- O card migra automaticamente da view de Franquia para a view de Oxy Hacker.
- O valor exibido em drill-downs, gauges e somatórios passa a ser R$ 32.000.
- Futuros casos similares só precisam de uma linha nova no mapa.

## Pré-requisito

Preciso do **ID do card no Pipefy** da "Ashia Andrade". Como não consigo acessar o banco externo daqui, na implementação eu vou:

1. Adicionar um lookup temporário por **título normalizado** (`"ashia andrade"`) como fallback, já cobrindo o caso agora.
2. Logar no console o ID do card quando o override por título disparar, para você me passar o ID e a gente trocar para match exato (mais seguro contra cards homônimos no futuro).

## Mudanças (arquivo único)

**`src/hooks/useExpansaoAnalytics.ts`**

1. Adicionar no topo do arquivo:
   ```ts
   // Overrides de classificação/valor para cards específicos do Pipefy
   // que estão com dados incorretos na origem e ainda não foram corrigidos lá.
   // Preferir match por ID. Match por título é fallback temporário.
   const CARD_OVERRIDES_BY_ID: Record<string, Partial<{ produto: string; taxaFranquia: number }>> = {
     // "1234567890": { produto: "Oxy Hacker", taxaFranquia: 32000 },
   };

   const CARD_OVERRIDES_BY_TITLE: Record<string, Partial<{ produto: string; taxaFranquia: number }>> = {
     "ashia andrade": { produto: "Oxy Hacker", taxaFranquia: 32000 },
   };

   function normalizeTitle(s: string): string {
     return (s || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
   }
   ```

2. Em `parseRawCard`, antes do `return`, aplicar override:
   - Lê `produto` e `taxaFranquia` do row normalmente.
   - Se houver override por ID, sobrescreve.
   - Senão, se houver override por título normalizado, sobrescreve e loga `console.warn` com o ID para registro.
   - Recalcula `valor` final usando o `taxaFranquia` (eventualmente sobrescrito) seguindo a mesma regra atual (taxaFranquia > soma > defaultTicket).

3. Importante para o filtro de produto funcionar: a comparação `if (rowProduto !== produto) continue;` (linhas 217–218 e 234–235) usa o `Produtos` cru do row, **não** o card já parseado. Para o override surtir efeito no filtro, vou trocar essas comparações para usar o `produto` **após** o override — ou seja, fazer o override antes do filtro, parseando o card e descartando-o se o produto resultante não bater.

## Efeitos esperados

- Card "Ashia Andrade" some da aba Franquia.
- Aparece na aba Oxy Hacker, contando em Leads/MQL/RM/RR/Proposta/Venda conforme as fases por que passou.
- Valor de R$ 32.000 aparece em pipeline, ticket médio, vendas e drill-downs.
- Funil cumulativo de Expansão Oxy Hacker passa a incluir esse card.

## Não muda

- Nada no Pipefy (continua marcado como Franquia lá até alguém corrigir).
- Nenhum outro card.
- Lógica de Modelo Atual, O2 TAX, Marketing, NPS etc. permanece intacta.
- Estrutura dos componentes UI permanece intacta.

## Validação após implementação

1. Abrir aba Expansão → Oxy Hacker no período em que o card existe — deve aparecer "Ashia Andrade" com R$ 32k.
2. Abrir aba Expansão → Franquia no mesmo período — não deve mais aparecer.
3. Conferir console: deve haver um warn com o ID do card. Você me passa esse ID e na sequência migramos para `CARD_OVERRIDES_BY_ID` (mais robusto que título).

## Dívida técnica registrada

Esse mapa é uma exceção manual. Toda vez que o time de operação corrigir o card no Pipefy, a entrada correspondente deve ser removida daqui. Sugiro revisão trimestral do mapa.