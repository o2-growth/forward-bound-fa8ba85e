# G4 Real: enriquecer detalhamento do funil por live + filtro MQL

## Backend — `supabase/functions/g4-metrics/index.ts`
Ampliar a query `g4_leads_360` fazendo `LEFT JOIN` com `pipefy_moviment_cfos` (deduplicado por e-mail, pegando o card mais recente — mesmo padrão usado no funil) para trazer por lead:
- `faixa` (Faixa de faturamento)
- `valor_mrr`, `valor_setup`, `valor_pontual`
- `tcv` = `valor_mrr * 12 + valor_setup + valor_pontual` (calculado no map)
- `sdr` (SDR responsável)
- `data_entrada_pipe` (Entrada do card mais recente)
- `dias_no_pipe` (calculado no map: hoje − dataEntrada, em dias)

Devolvidos no array `leads[]` já existente.

## Tipos — `src/hooks/useG4RealMetrics.ts`
Adicionar em `G4RealLead`: `faixa`, `valorMRR`, `valorSetup`, `valorPontual`, `tcv`, `sdr`, `dataEntradaPipe`, `diasNoPipe`.

## Dialog — `src/components/planning/g4/LiveDetailDialog.tsx`
Novas colunas na tabela:
- **Faixa** (badge)
- **MRR / Setup / Pontual / TCV** (currency, tabulares)
- **SDR**
- **Dias no pipe** (número + data de entrada em tooltip)

Manter as já existentes (Nome/e-mail, Empresa, Fase atual, Closer, Mão, Diag, link Pipefy).

Adicionar **toggle "Só MQL"** no cabeçalho do dialog:
- Regra MQL Modelo Atual: `faixa` mapeada para valor ≥ R$ 200k (reusar helper `isMqlQualified` de `useModeloAtualAnalytics` — extrair para `src/lib/mqlFaixa.ts` para poder importar em ambos os lados sem dependência circular).
- Quando ativo, filtra a lista mostrada e atualiza o contador no badge.

## Fora de escopo
- Sem mudanças em KPIs de topo, tabela de leads geral, ou nos cards do funil por live.
- Sem migração/schema — leitura pura do DB externo.
- Não altero regra de contagem do funil (edge function segue mesma contagem).
