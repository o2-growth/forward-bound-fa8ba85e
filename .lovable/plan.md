## Diagnóstico — "Negócios Perdidos sem motivo"

### Causa raiz

Os cards do Modelo Atual (e BUs de expansão) são lidos da tabela `pipefy_moviment_cfos`, que é uma tabela de **movimentações** (uma linha por entrada em cada fase). A coluna `"Motivo da perda"` no Pipefy só é preenchida no movimento em que o card entrou na fase **"Perdido"**.

No `getLostDeals` (em `src/hooks/useModeloAtualAnalytics.ts`, linhas 610-634, e equivalentes em `useO2TaxAnalytics.ts` / `useExpansaoAnalytics.ts`), o filtro usado é:

```ts
if (card.faseAtual !== 'Perdido') continue;   // Fase Atual = estado final do card
```

Isso pega **todas as linhas de movimento** (RM, RR, Proposta, etc.) de qualquer card cujo estado final seja "Perdido". Como o campo `"Motivo da perda"` está vazio em todas as linhas que não sejam a entrada em "Perdido", o `getLossReasons` agrupa a maioria como `"Não informado"`.

Resumindo:
- O motivo só existe em 1 das N linhas de movimento de cada card perdido.
- O código está somando **todas** as N linhas como "perdidas" e tratando cada linha como um deal independente, então a maioria cai em "Sem motivo / Não informado".

Efeito visível: a Análise de Perdas mostra muito mais deals perdidos do que existem de fato, e quase todos sem motivo.

### Correção proposta

1. **Deduplicar por `card.id` em `getLostDeals`** nos três hooks (`useModeloAtualAnalytics`, `useO2TaxAnalytics`, `useExpansaoAnalytics`).
2. **Selecionar a melhor linha por card**: preferir a linha com `fase === 'Perdido'` (que carrega o motivo); se não existir, usar a linha mais recente.
3. **Propagar o motivo para o card escolhido** mesmo quando a linha "vencedora" for de outra fase, copiando `motivoPerda` da linha onde `fase === 'Perdido'` se houver alguma.
4. **Aplicar o filtro de período sobre a Data de Criação do card**, não sobre a `Entrada` da fase, para evitar contar o mesmo card várias vezes.
5. Manter "Não informado" apenas para cards que realmente não têm motivo registrado no Pipefy.

### Arquivos a alterar

- `src/hooks/useModeloAtualAnalytics.ts` — `getLostDeals` e `getLossReasons`
- `src/hooks/useO2TaxAnalytics.ts` — `getLostDeals` e `getLossReasons`
- `src/hooks/useExpansaoAnalytics.ts` — `getLostDeals` e `getLossReasons`

Sem mudanças de UI, banco ou edge functions — apenas lógica de agregação nos hooks. Após o ajuste, a contagem de "Negócios Perdidos" deve cair para o número real de cards perdidos e a fatia de "Não informado" reduzir significativamente.