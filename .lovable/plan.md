## Problema

A aba Churn mostra **125 cards no Q1/2026**, mas ~99 deles são "fantasmas" de uma migração em massa feita no Pipefy em **11–12/Jan/2026** (60 cards movidos pra `Churn`, 30 pra `Atividades finalizadas`, 9 pra `Desistência` no mesmo dia, sem nenhuma data oficial de churn preenchida).

Como o código usa `Entrada na fase` como último fallback de `dataEncerramento`, esses cards históricos aparecem como se tivessem churnado todos juntos em Jan/2026.

## Solução

Mudar a regra de elegibilidade do dossier de churn em `src/hooks/useOperationsData.ts` (função `processProjects`).

### Regra atual (linhas 357–441)

Inclui qualquer card em `Churn`, `Atividades finalizadas` ou `Desistência` que tenha `_refDate >= 2025-10-01`, usando `entrada_fase` como fallback final pra data.

### Regra nova

Para o card entrar no `churnDossier`, deve ter pelo menos **uma** das duas datas oficiais preenchidas:

1. `Data do churn` (campo do card em Central de Projetos), OU
2. `Finalizacao contrato ultimo dia` (campo da tratativa correspondente)

Se nenhuma das duas existir, o card é **descartado** (não importa em que fase terminal esteja).

### Implementação

1. **Mover a hierarquia de `dataEncerramento` para ANTES do `return`** já está assim, mas adicionar um guard:
   ```ts
   const dataOficial = finalizacaoContrato || dataChurnManual;
   if (!dataOficial) return null;  // descarta cards sem evidência oficial
   ```

2. **Remover `dataPhaseEntry` e os fallbacks legados** (`card['Data encerramento']`, `saidaDate`, `tratEntradaDate`) da composição de `dataEncerramento` — passam a ser ignorados como fonte primária. `dataEncerramento` = sempre `dataOficial`.

3. **Filtrar nulls** no `.filter()` final.

4. **Manter intactos**:
   - Os overrides oficiais de Abr/2026 (`APR_2026_OFFICIAL`) — injetam cards sintéticos com data fixa.
   - O card sintético do Protectface (Mar/2026).
   - Todos os `CHURN_OVERRIDES` existentes.
   - O `CHURN_CUTOFF` (Out/2025).

### Resultado esperado

Distribuição mensal corrigida (simulada via SQL):

```
Jan/2026:  ~5 churns reais (vs 104 hoje)
Fev/2026:  ~3–5
Mar/2026:  ~10
Abr/2026:   8 (oficial)
```

Q1/2026 cai de **125 → ~20–25 churns reais**.

### Risco

Cards onde a operação esqueceu de preencher `Data do churn` ficam fora do dossier. Mitigação: se aparecer cliente real ausente, adicionar override manual em `CHURN_OVERRIDES` ou no bloco de injeção (mesmo padrão de Abr/2026).

## Arquivo afetado

- `src/hooks/useOperationsData.ts` — função `processProjects`, bloco do `churnDossier` (linhas ~357–441).
