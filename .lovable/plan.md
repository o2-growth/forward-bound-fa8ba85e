## Causa raiz

O drill-down MQL/Leads das BUs Franquia e Oxy Hacker (sem filtro de closer/SDR/origem) usa `useExpansaoMetas.getDetailItemsForIndicator` e `useOxyHackerMetas.getDetailItemsForIndicator`, **não** o `useExpansaoAnalytics`. Esses dois hooks (`useExpansaoMetas.ts`, `useOxyHackerMetas.ts`) **nunca aplicam `isJunkCard`** — por isso títulos como `teste`, `nao_atender_teste_track@gmail.com` e IDs conhecidos de teste continuam vazando.

`useO2TaxMetas.ts` tem o mesmo gap (mesmo padrão de código) e será alinhado por consistência.

Verifiquei em `useModeloAtualMetas.ts` que `isJunkCard` cobre:
- allowlist fixa de IDs (`TEST_CARD_IDS`)
- padrões de título: `\bteste?s?\b`, `\btesting\b`, `asdf`, `qwerty`, `abc`, `xxx`, apenas dígitos curtos, só símbolos

Isso já pega "teste" e "TESTE". Não pega `nao_atender_teste_track@gmail.com` porque `_` é word char e quebra o `\b`. Vou adicionar um padrão para casos assim (`nao_atender`, `nao atender`, `noreply`, e a substring "teste" quando cercada por `_`).

## Mudanças

### 1. `src/hooks/useModeloAtualMetas.ts`
Ampliar `TEST_TITLE_PATTERNS` para cobrir emails/handles de teste:

```ts
/nao[_\s-]?atender/i,     // nao_atender, nao atender, nao-atender
/no[_\s-]?reply/i,        // noreply, no_reply
/[_.-]teste?[_.-]/i,      // _teste_, .teste., -teste-
/teste?_?track/i,         // teste_track, testetrack
```

### 2. `src/hooks/useExpansaoMetas.ts`
- Importar `isJunkCard` de `useModeloAtualMetas`.
- No loop `for (const row of responseData.data)` que constrói `movements`, adicionar antes de qualquer processamento:
  ```ts
  if (isJunkCard({ id: String(row.ID || ''), titulo: String(row['Título'] || '') })) continue;
  ```

### 3. `src/hooks/useOxyHackerMetas.ts`
Mesma mudança do item 2 (mesmo padrão de código; usa a mesma tabela `pipefy_cards_movements_expansao`, filtrando `Oxy Hacker`).

### 4. `src/hooks/useO2TaxMetas.ts`
Mesma mudança do item 2 para o loop que parseia rows do Pipefy (aplicar `isJunkCard` na origem, antes de contar em qtd/valor/detail items).

## Efeito esperado

- Rows como `teste`, `nao_atender_teste_track@gmail.com`, `123`, `asdf`, etc. deixam de aparecer nos drill-downs de MQL/Leads/RM/RR/Proposta/Venda de Franquia, Oxy Hacker e O2 TAX.
- Contagens (`getQtyForPeriod`, `getValueForPeriod`) das gauges caem para excluir esses cards — coerente com o comportamento já existente em Modelo Atual e nas próprias funções de `useExpansaoAnalytics`.
- Nomes reais listados pelo usuário (Maria Missileide, Rogelio, Fernando, etc.) **não** serão filtrados — apenas cards com título que casa com os padrões de teste. Se algum desses também for um card de teste real (ex.: SDR criou lead fictício com seu próprio nome), me avise quais IDs para incluir na allowlist `TEST_CARD_IDS`.

## Observação sobre a lista enviada

Vários nomes na lista (ex.: Maria Missileide, Rogelio Duran Amoedo, Rafael Guimarães, Fernando, Claudio, Marcos André) **não têm marcadores óbvios de teste no título**. Se esses também devem ser filtrados, preciso do critério: são cards do SDR "teste" no Pipefy? Vieram sem `Data de criação`? Estão em pipe de sandbox? Manda 2-3 IDs de exemplo e adapto o filtro (por SDR, por origem, ou por ID direto).
