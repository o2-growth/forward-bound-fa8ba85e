# Fix: coluna Setup vazia em "Proposta Enviada" no acelerômetro

## Diagnóstico
No drill-down clicável do funil (`ClickableFunnelChart`), a coluna **Setup** já está declarada para todos os indicadores (linha 316), mas ela vem vazia em Proposta porque:

- Em `useModeloAtualAnalytics.toDetailItem` usamos `setup: card.valorSetup`.
- `card.valorSetup` é lido do **movimento específico** da fase "Proposta enviada / Follow Up". Se o valor de Setup só foi preenchido depois (ex: quando o card avançou para Contrato Assinado / Ganho), a linha de movimento da fase Proposta fica com `valorSetup = 0`.
- Só os `allOpenCards` passam por `hydrateOpenCardsWithHistory` (pega o max dos valores no histórico). Os cards devolvidos por `getCardsForIndicator('proposta')` não são hidratados.

Isso explica por que MRR/Pontual às vezes aparecem mas Setup fica em branco (ou zero).

## Correção

Enriquecer os cards não-vendas com o **máximo** dos valores monetários encontrados no `fullHistory` do próprio card, antes de virarem `DetailItem`.

### Passos (arquivo `src/hooks/useModeloAtualAnalytics.ts`)

1. Criar um `useMemo` `maxMonetaryByCardId: Map<string, { mrr, setup, pontual, educacao }>` percorrendo `[...fullHistory, ...cards, ...allOpenCards]` e guardando o `Math.max` de cada `valor*` por `card.id`.
2. Em `toDetailItem`, para cada card:
   - buscar o registro em `maxMonetaryByCardId`;
   - usar `Math.max(card.valorSetup, maxSetup)` (idem MRR, Pontual, Educação);
   - recalcular `total` e `value` com esses valores hidratados.
3. Não mexer na lógica de contagem do funil — apenas na apresentação dos itens do drill-down. Vendas continuam usando os valores do próprio movimento (que já são os corretos por definição).

### Fora de escopo
- Não altero O2 TAX / Franquia / Oxy Hacker agora (o usuário reclamou só do Modelo Atual / acelerômetro Proposta). Se quiser aplicar lá também, faço em seguida.
- Nenhuma mudança de schema, edge function ou UI/colunas.

### Validação
- Abrir acelerômetro → clicar em **Proposta Enviada** → cards que já tinham Setup preenchido em Contrato/Ganho aparecem com o valor na coluna Setup.
- Total da linha passa a somar MRR+Setup+Pontual corretamente.
