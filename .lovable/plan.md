## Objetivo

Todo card cujo produto é **Franquia** deve ser classificado como **Inbound**, independentemente de ter ou não os campos de origem preenchidos — nunca cair em `sem_origem` (nem em outra categoria).

## Diagnóstico

- No mês atual (Jul/26) a Franquia tem 11 cards criados e todos os 5 campos de origem (`Tipo de Origem do lead`, `Origem do lead`, `Fonte`, `Campanha`, `SDR responsável`) estão nulos no Pipefy → `classifyLeadSource` devolve `sem_origem`.
- A regra do usuário é de negócio: Franquia = canal Inbound por definição. O classifier precisa de um override por produto.

## Mudança

Arquivo: `src/lib/leadSource.ts`

1. Adicionar campo opcional `produto?: string | null` em `ClassifyInput`.
2. No topo de `classifyLeadSource`, logo após normalizar os inputs e antes de qualquer outra regra (mas depois do sentinel de Monetização), incluir:

```ts
const produto = norm(c.produto);
if (produto.includes('franquia')) return 'inbound';
```

Isso garante que cards de Franquia sempre virem Inbound, mesmo com todos os campos vazios ou com valores que hoje cairiam em outra categoria.

## Propagação — passar `produto` nos call sites

Buscar todos os `classifyLeadSource(` no repo e, quando o card tiver produto conhecido, passar `produto: card.produto` (ou o campo equivalente `Produtos` do row raw). Alvos prováveis:

- `src/hooks/useExpansaoAnalytics.ts` (Franquia + Oxy Hacker) — já parseia `produto`.
- `src/hooks/useModeloAtualAnalytics.ts`, `src/hooks/useO2TaxAnalytics.ts`, `src/hooks/useMonetizacaoAnalytics.ts`, `src/hooks/useOutboundAnalytics.ts` — passar produto quando existir; nesses BUs a regra "Franquia→inbound" não dispara, então é seguro.
- Qualquer widget/aggregator que chame o classifier diretamente (ex.: `LostDealsWidget`, `LossReasonsWidget`, `temperaturaAggregator`, `EventosG4Section`).

## Fora do escopo

- Não mexer no preenchimento dos cards no Pipefy.
- Não alterar as regras dos outros produtos.
- Não excluir Perdido do bucket de origem (mudança separada, não pedida agora).

## Validação

Depois da mudança, recontar os 11 cards de Franquia de Jul/26: esperado `inbound: 11, sem_origem: 0`.
