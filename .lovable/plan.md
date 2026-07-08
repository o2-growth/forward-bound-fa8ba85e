# Faixa de faturamento no G4 Real — fallback via g4_diagnostico

## Diagnóstico
- `pipefy_moviment_cfos."Faixa de faturamento mensal"` só existe para leads que viraram card no Pipe. Leads que só se inscreveram/preencheram diagnóstico ficam com `faixa = null`.
- Já confirmei via curl que o join com Pipe está devolvendo a faixa correta para quem tem card (ex.: "Entre R$ 1 milhão e R$ 5 milhões").
- Faltando: enriquecer com a faixa que o próprio lead responde no **formulário do diagnóstico** (coluna `g4_diagnostico.payload` — jsonb).

## Passos

### 1. Descobrir a chave no payload
Adicionar `g4_diagnostico` à `validTables` de `supabase/functions/query-external-db/index.ts` (só leitura, mesmo padrão dos outros) e usar `action: preview` para inspecionar 1 payload.

### 2. Atualizar `supabase/functions/g4-metrics/index.ts`
Na CTE dos leads, criar `diag_faixa` que agrupa por email pegando o `payload->>'<chave>'` (COALESCE das variações mais prováveis: `faixa_de_faturamento_mensal`, `faixa_faturamento`, `Faixa de faturamento mensal`, `faixa`), preferindo o registro mais recente por `ts`.

`SELECT ... COALESCE(p.faixa, d.faixa) AS faixa` no output final.

### 3. Sem mudanças na UI
O dialog já lê `faixa`. Vai aparecer automaticamente para os leads que só têm diagnóstico.

## Fora de escopo
- Não puxo faixa de `g4_inscritos` (a tabela não tem esse campo).
- Não altero regra de contagem de nada — só enriqueço a coluna Faixa exibida.
