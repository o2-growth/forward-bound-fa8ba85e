# Monetização: 3 dos 5 cards sem valor

## Causa raiz

O hook `useMonetizacaoAnalytics` hidrata valores lendo **nomes fixos** de coluna:

```
valor_diagn_stico, valor_educa_o, valor_cfoaas, valor_oxy, valor_setup, ...
```

Mas o sync/atualização recente grava com nomes **sem os `_` extras** dos acentos. Em `supabase/functions/analyze-churn-tratativa/index.ts:280-283` a mesma tabela usa **`valor_diagnostico`** (sem underscore), o que confirma o descasamento. Provável análogo: `valor_educacao` em vez de `valor_educa_o`. Como os cards antigos (FromTherm, Samba, Dom Duan) foram atualizados nesses nomes "corretos", o hook lê `null` nas variantes com underscore e cai no fallback de `moeda` — que também está null para eles → `valorTotal = 0`.

Os 2 cards novos aparecem com valor porque provavelmente têm `moeda` preenchida (fallback funciona) ou coincidem com nomes esperados.

## Correção

Substituir a lista fixa `VALOR_FIELDS` por **detecção dinâmica**: qualquer chave da linha começando por `valor_` (exceto `valor_mrr`, que é agregado calculado) participa da hidratação. Assim, tanto `valor_diagn_stico` quanto `valor_diagnostico` são captados sem precisar adivinhar snake_case.

Passos em `src/hooks/useMonetizacaoAnalytics.ts`:

1. **Descobrir os campos dinamicamente**: percorrer todas as linhas de `historyRows` + `periodRows` e coletar em um `Set` todo `key` que comece por `valor_` e cujo valor seja numérico (ou parseável). Guardar isso em `discoveredValorFields`.
2. **Hidratar por card**: para cada `f ∈ discoveredValorFields`, `valores[f] = max(toNumber(r[f]))` sobre todo histórico (comportamento atual, só que sobre a lista descoberta).
3. **Classificação MRR/Setup/Pontual robusta**: normalizar o nome do campo (remover underscores duplicados/pontuais que substituem acentos) e casar por **substring**, aceitando as duas variantes:
   - MRR: contém `cfoaas`, `oxy`, `assessoria_mrr`, `bpo`, `coordenador_financeiro`
   - Setup: contém `setup`
   - Pontual: contém `diagn` (ó/o), `turnaround`, `valuation`
   - Educação: contém `educa` (ç/c) — permanece **fora** da soma padrão (mantém regra memory: MRR/Setup/Pontual excluem Educação).
4. **`valorTotal`**: `somaValorFields > 0 ? somaValorFields : moedaMax` (inalterado).
5. **Log de diagnóstico (uma vez por render)**: `console.info('[Monetização] valor_* fields detectados:', […])` para facilitar auditorias futuras se surgirem novos nomes.
6. Manter compat com o fallback `moeda` para cards antigos.

## Arquivos

- `src/hooks/useMonetizacaoAnalytics.ts` — troca de lista fixa por detecção dinâmica + matcher por substring nas classificações MRR/Setup/Pontual/Educação.

## Validação

- Abrir aba Monetização em julho: os 5 cards devem exibir `valorTotal > 0` para todo card que tenha qualquer coluna `valor_*` preenchida no histórico (independente do sufixo com/sem underscore).
- Verificar no console o log `valor_* fields detectados` — deve incluir `valor_diagnostico`/`valor_diagn_stico`/`valor_educacao` conforme presentes.
- Somatórios do funil (MRR, Setup, Pontual) devem refletir os novos valores.
