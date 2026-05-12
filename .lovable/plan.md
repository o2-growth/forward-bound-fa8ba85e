## Causa raiz

A edge function `analyze-churn-tratativa` lê `SELECT *` da tabela `pipefy_moviment_tratativas` (todos os campos vêm do DB), mas no `tratativa_historico.map(...)` só serializa 11 campos no JSON do dossiê. Tudo o que parece "comentário" — descrição da situação, plano de ação, feedback, observações, problemas com a Oxy — está sendo **descartado antes de chegar no JSON e na IA**.

A tabela tem 13 campos de texto livre que hoje não vão pro modelo:

- `Descricao da Situacao`
- `Problemas com a Oxy cliente`
- `Problemas com a Oxy`
- `Detalhes da Tratativa`
- `Plano de Acao definido`
- `Solucao Implementada com Sucesso`
- `Negociacao paralela rescisao`
- `Feedback Final`
- `Observacoes finalizacao`
- `Motivo da perda`
- `Termo de Rescisao Enviado`
- `Destino` (próxima fase)
- `Data de Solicitacao` / `Data de Inicio da Tratativa` / `Data prevista finalizacao tratativa` / `Data finalizacao plano de acao` / `Finalizacao contrato ultimo dia`

## Mudanças

### 1. `supabase/functions/analyze-churn-tratativa/index.ts`

- Estender a `interface TratativaRow` com todos os campos de texto livre e datas listados acima.
- Estender o map em `tratativa_historico` pra incluir esses campos com `snake_case` consistente:
  - `descricao_situacao`, `detalhes_tratativa`, `plano_de_acao`, `solucao_implementada`, `feedback_final`, `observacoes_finalizacao`, `negociacao_paralela_rescisao`, `motivo_da_perda`, `problemas_com_oxy_cliente`, `problemas_com_oxy`, `termo_rescisao_enviado`, `destino`.
  - Datas: `data_solicitacao`, `data_inicio_tratativa`, `data_prevista_finalizacao`, `data_finalizacao_plano_acao`, `data_finalizacao_contrato`.
- Filtrar valores nulos/vazios na serialização (omit chave se string vazia ou null) pra não inflar o JSON sem necessidade — só campos preenchidos vão pro prompt.
- Atualizar `tratativa_resumo` pra incluir o último `feedback_final`, último `plano_de_acao`, último `descricao_situacao` e último `observacoes_finalizacao` não-nulo (pega da movimentação mais recente que tiver cada campo). Esses são os "comentários consolidados" que mais importam pro post-mortem.
- Atualizar `SYSTEM_PROMPT`:
  - Na seção **🎯 Causa raiz**, instruir a IA a citar evidência dos novos campos textuais (`Detalhes da Tratativa`, `Plano de Acao definido`, `Feedback Final`, `Observacoes finalizacao`, `Problemas com a Oxy`).
  - Reforçar que se o cliente teve `Plano de Acao definido` mas churnou mesmo assim, citar o plano e perguntar por que falhou.
  - Reforçar uso do `Feedback Final` literal quando preenchido.

### 2. `src/components/planning/cs/ChurnAnalysisDrawer.tsx`

Sem mudança lógica — o `<details open>` com o JSON cru já vai mostrar automaticamente os novos campos quando o backend passar a serializá-los. Apenas validar visualmente após deploy.

### Sem mudança

- Schema do banco (campos já existem).
- Frontend além do drawer.
- Outras edge functions.
- NÃO vai chamar Pipefy GraphQL pra puxar comentários do chat do card — pelo schema, o "comentário" útil pro churn já está em campos estruturados da tratativa. Se depois de aplicar isso o user ainda quiser o chat literal do Pipefy, abrimos uma segunda iteração.

## Resultado esperado

No drawer "Post-mortem IA", o JSON expansível vai passar a mostrar — pra cada movimentação da tratativa — todos os campos textuais preenchidos pelo CFO/CS (descrição, plano, feedback, etc.), e a análise da IA vai citar esses textos como evidência em vez de só inferir das fases.
