## O que medi agora

Chamei a função `g4-metrics` direto:

- **3,2 s** de resposta já "quente" (cold start fica bem pior)
- **1,37 MB** de JSON, com **1.745 leads** completos
- Cada load do dash executa: 4 queries pesadas no Postgres externo (G4) **+** uma chamada ao vivo na API do Pipefy para os 15 cards em Ganho
- No front, `staleTime` é de apenas 60 s → praticamente toda visita refaz tudo
- O payload ainda carrega campos de auditoria (`camposUsados`, `camposDescartados`, `camposNaoClassificados`) que só servem para debug

Ou seja: a demora é a função recalculando tudo do zero, incluindo ida ao Pipefy, a cada abertura da página.

## Plano

### 1. Cache no servidor (maior ganho)
- Criar tabela `g4_metrics_cache` no backend (payload jsonb + `generated_at`).
- `g4-metrics` passa a: devolver o cache se tiver < 10 min; se estiver velho, devolver o cache **na hora** e recalcular em background (stale-while-revalidate).
- Parâmetro `?refresh=1` para forçar recálculo (botão "Atualizar" no dash).
- Resultado esperado: resposta em ~100–300 ms na maioria dos acessos, com os mesmos números de hoje.

### 2. Payload menor
- Remover do JSON os campos de auditoria (`camposUsados`, `camposDescartados`, `camposNaoClassificados`) — mantê-los só sob `?debug=1`.
- Enviar apenas os campos que o dashboard usa, sem nulos redundantes.
- Ativar compressão gzip na resposta.
- Esperado: de 1,37 MB para algo em torno de 300–400 KB.

### 3. Pipefy fora do caminho crítico
- A busca dos valores dos Ganhos no Pipefy passa a rodar só no recálculo (background), nunca bloqueando quem abre a página.

### 4. Front mais paciente
- `useG4RealMetrics`: `staleTime` de 60 s → 10 min, `gcTime` maior, sem refetch em foco de janela.
- Indicador de "atualizado às HH:MM" + botão de refresh manual usando `?refresh=1`.

## Garantias
- Nenhuma regra de cálculo muda: mesmas queries, mesma canonicalização de valores, mesmos totais. Só muda **quando** o cálculo roda.
- Vou comparar o JSON antes/depois (KPIs, TCV total, lista de ganhos) para confirmar que os números ficam idênticos.

## Detalhes técnicos
- Arquivos: `supabase/functions/g4-metrics/index.ts`, `src/hooks/useG4RealMetrics.ts`, `src/components/planning/g4/G4ConsolidatedDashboard.tsx` (botão/refresh + timestamp), migração nova para `g4_metrics_cache` (RLS + GRANT; escrita só via service_role).
