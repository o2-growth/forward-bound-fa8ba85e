# Plano — Metas por Closer com N closers + percentuais decimais

## Objetivo
Tornar a aba **Admin → Metas por Closer** funcional para qualquer quantidade de closers por BU (hoje até 5 em Modelo Atual) e permitir percentuais decimais (ex: 12,5%).

## Mudanças

### 1. `src/components/planning/CloserMetasTab.tsx`

**a) Edição livre (sem auto-ajuste)**
- Em `updateLocalPercentage`, remover o bloco que escolhe um "outro closer" e força `100 - valor`. Apenas atualizar a célula editada (clamp 0–100, sem `Math.floor`) e marcar `hasChanges`.
- Manter caso especial: BU com 1 closer → trava em 100.

**b) Suporte a decimais no Input**
- Trocar `parseInt(e.target.value)` por `parseFloat(e.target.value.replace(',', '.'))` para aceitar vírgula brasileira.
- Adicionar `step="0.1"` no `<Input type="number">`.
- Exibir valor formatado em pt-BR (ex: `12,5`) — usar um state local de string por célula ou `toLocaleString('pt-BR')` na exibição.
- Clamp: `Math.max(0, Math.min(100, valor))`, sem arredondar.

**c) Default exibido na tabela**
- Em `getLocalPercentage`, quando não há valor no DB nem local, retornar **0** (em vez de 50).
- Manter 100 quando `validClosers.length === 1`.

**d) Validação de soma com tolerância**
- `getMonthTotal` continua somando todos os closers válidos.
- `allMonthsValid`: comparar com tolerância de ponto flutuante → `Math.abs(total - 100) < 0.01`.
- Badge do total exibe valor com 1 casa decimal quando necessário.

**e) Botão "Resetar 50/50" → "Zerar BU"**
- Renomear botão e toast.
- Chamar nova mutation `resetBuToZero`.

**f) Texto "Como funciona"**
- Atualizar exemplo para refletir N closers e mencionar suporte a decimais (ex: "Pedro 30%, Daniel 20%, Thiago 17,5%, Amanda 17,5%, Bruna 15%").

### 2. `src/hooks/useCloserMetas.ts`

**a) Default em `getPercentage`**
- Default 0 quando não há registro e BU tem mais de 1 closer.
- Manter 100 para BU com 1 closer.
- Remover bloco especial de `ZERO_DEFAULT_CLOSERS` (Bruna).

**b) Substituir `resetBuToDefault` por `resetBuToZero`**
- Iterar apenas sobre `BU_CLOSERS[bu]` (não a constante global `CLOSERS`).
- Upsert `percentage = 0` para todos os meses dos closers válidos.

**c) Coluna `percentage`**
- Tipo no DB já é `numeric`, então decimais persistem sem migração.
- Garantir que `bulkUpdateMetas` envie o número como está (sem arredondar).

### 3. Logs de auditoria
- Em `handleSave`, formatar valores no log com `.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })` para ler "12,5%" no histórico.

## Detalhes técnicos
- Sem mudanças de schema; `closer_metas.percentage` já é `numeric`.
- `getFilteredMeta` não muda — soma de decimais funciona naturalmente.
- Botão Salvar bloqueado enquanto soma ≠ 100 (com tolerância 0,01) em qualquer mês.

## Fora de escopo
- Não alterar lógica do dashboard (consumo do `getFilteredMeta` permanece igual).
- Não tocar em `useClosersMetas.ts` (arquivo distinto).
- Não mexer em `SdrMetasTab` (não usa percentuais).
