## O que vamos fazer

Dois ajustes independentes:

### 1. Corrigir valores do Martinelli no dashboard G4
O card 1303731824 no Pipefy está com valores errados (MRR R$ 7,5702 / Setup R$ 21). Como não conseguimos editar o Pipefy daqui, aplicaremos um **override manual** no dashboard `/dash-g4` para exibir os valores corretos:
- **MRR: R$ 7.570,20**
- **Setup: R$ 21.000,00**

O override entra no mesmo padrão que já usamos hoje (`MANUAL_EXCLUDED_G4_CARD_IDS`, whitelist de Finders Fee). Criaremos um novo `G4_MANUAL_VALUE_OVERRIDES` (map por email) que sobrescreve `mrr` e `setup` dos leads Ganho antes de somar KPIs e antes de renderizar a tabela.

Arquivo tocado: `src/components/planning/g4/G4ConsolidatedDashboard.tsx`.

### 2. Limpar MQLs duplicados e cards de teste dos funis Oxy Hacker e Franquia

**Diagnóstico confirmado pela investigação read-only:**

Franquia e Oxy Hacker rodam por dois caminhos distintos (ambos alimentam a UI):

- **`useExpansaoAnalytics.ts`** (drill-downs e cards de indicadores) — já filtra cards de teste (`isJunkCard`) e já exclui `motivoPerda = "Duplicado"` para MQL, mas:
  - Só considera "Duplicado" (1 motivo), enquanto Modelo Atual exclui **7 motivos** (`MQL_EXCLUDED_LOSS_REASONS`).
  - Exclusão do "Duplicado" só afeta o count de MQL — não cascateia para RM/RR/Proposta/Venda (permite um card duplicado seguir contando nas fases seguintes).
  - Usa o *primeiro* `motivoPerda` encontrado no histórico; não considera se foi revertido depois. Modelo Atual usa o mais recente.

- **`useExpansaoMetas.ts`** e **`useOxyHackerMetas.ts`** (gauges de meta, gráficos empilhados, funil por período, Growth, Marketing, CEO) — filtram cards de teste, mas **não têm nenhuma exclusão de motivo de perda**. MQLs duplicados/perdidos por motivo inválido contam integralmente aqui.

**O que faremos:**

1. **Padronizar a lista de motivos excluídos** compartilhando `MQL_EXCLUDED_LOSS_REASONS` de `useModeloAtualMetas.ts` (importar; não duplicar) nos três hooks: `useExpansaoAnalytics.ts`, `useExpansaoMetas.ts`, `useOxyHackerMetas.ts`.

2. **Em `useExpansaoAnalytics.ts`:**
   - Substituir `duplicadoCardIds` (só "Duplicado") por `excludedMqlCardIds` construído com a mesma lógica do Modelo Atual (`buildExcludedMqlCardIds` — pega o `motivoPerda` do movimento mais recente por card).
   - Aplicar essa exclusão **também nas fases downstream** (rm, rr, proposta, venda) — do jeito que Modelo Atual faz — para não deixar um card "Duplicado"/"Fora de ICP" seguir contando depois do MQL.

3. **Em `useExpansaoMetas.ts` e `useOxyHackerMetas.ts`:**
   - Construir `excludedMqlCardIds` (mesmo método) a partir das linhas carregadas.
   - Descontar esses IDs do count de MQL e das fases seguintes.
   - Manter `isJunkCard` já existente (nada a mudar em testes — já estão cobertos por título/ID).

4. **Alinhar deduplicação de MQL por card** (`useExpansaoAnalytics.ts`):
   - Hoje MQL dedup usa apenas um `Set` de cardIds no loop atual, sem cruzar meses — o que pode contar um card ≥2 vezes quando ele entra em "Lead" e depois em "MQL" no mesmo mês. Vamos usar o `monthlyFirstEntries` (mesmo dict já criado para outras fases) para MQL também, garantindo **1 count por card por mês** para a fase MQL.

**Fora de escopo desta rodada** (não pedidos pelo usuário; se quiser depois, faço em outra rodada):
- Adicionar `@o2inc.com.br` à lista global de junk (hoje só existe no G4).
- Refatorar os 3 hooks para compartilhar mais código (redução de duplicação de qualificação MQL).

## Detalhes técnicos

**Arquivos editados**
- `src/components/planning/g4/G4ConsolidatedDashboard.tsx` — adicionar `G4_MANUAL_VALUE_OVERRIDES` e aplicar após o carregamento dos leads.
- `src/hooks/useExpansaoAnalytics.ts` — importar `MQL_EXCLUDED_LOSS_REASONS` e `buildExcludedMqlCardIds` (ou re-implementar localmente com mesma assinatura), substituir `duplicadoCardIds`, propagar exclusão para rm/rr/proposta/venda, usar `monthlyFirstEntries` para MQL.
- `src/hooks/useExpansaoMetas.ts` — mesma exclusão MQL + cascata.
- `src/hooks/useOxyHackerMetas.ts` — mesma exclusão MQL + cascata.

**Lista `MQL_EXCLUDED_LOSS_REASONS` de referência** (`useModeloAtualMetas.ts:44-49`):
Duplicado; Pessoa física, fora do ICP; Não é uma demanda real; Buscando parceria; Quer soluções para cliente; Não é MQL, mas entrou como MQL; Email/Telefone Inválido.

**Comportamento pós-mudança**
- Componentes que consomem esses hooks vão devolver counts menores de MQL/RM/RR/Proposta/Venda para Oxy Hacker e Franquia (esperado — é o objetivo). Metas em `funnel_metas` continuam intocadas.
- Nenhuma alteração em schema, migrations, edge functions ou dados.

**Riscos**
- Se algum lead legítimo estiver marcado com um dos 7 motivos por engano no Pipefy, ele deixa de contar. Reversão: remover o motivo no Pipefy ou remover o motivo da lista.
