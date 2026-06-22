## Objetivo
Limpar a tabela "Visão Total — Indicadores 26" (2026) removendo a linha que não faz sentido e preenchendo as linhas que hoje estão vazias mas cujos dados já existem nos hooks do projeto.

## Mudanças

### 1. Remover linha
- **Conversas/marcadas** — retirar do array `out` em `src/hooks/useIndicators26Live.ts` (não temos fonte confiável e o usuário pediu para retirar).

### 2. Preencher linhas hoje vazias (`NULL_M`) com dados já disponíveis

Em `src/hooks/useIndicators26Live.ts`:

- **Risco de churn** → snapshot `operations.data.kpis.emTratativa` replicado para cada mês (mesmo padrão de `Clientes ativos`), `avg` para Qs/Total. Justificativa: só temos snapshot atual, mas é o melhor dado disponível.
- **Pedido de churn** → contagem mensal de novas tratativas abertas em 2026 (`TratativaCard.Entrada` por mês). Como `useOperationsData` hoje não devolve `rawTratativas`, vou adicioná-lo ao retorno do hook (sem alterar nenhum outro consumidor) e consumir em `useIndicators26Live`. Soma para Qs/Total.
- **Net Customer Growth** → `vendaM[i] - logoChurnMonthly[i]` por mês. Soma para Qs/Total.
- **% Net Customer Growth** → `NCG / clientesAtivosSnap` por mês (avg para Qs/Total).

### 3. Mantidas como `NULL_M` (sem fonte confiável hoje)
SQL, CPSQL, SQL/MQL, SQL/Leads, Tentativas de chamada, Chamadas atendidas, Conversas efetuadas, Taxa Tentativas/Atendidas, ARPU (Setup), Margem Bruta, LTV Final, Net Revenue Retention, % Net Revenue Retention, Time e ferramentas, Despesas totais, ROI LTV Final. (Posso ligar essas depois quando definirmos a fonte.)

## Arquivos afetados
- `src/hooks/useIndicators26Live.ts` — remoção da linha, novas linhas calculadas, dependências do `useMemo` ajustadas.
- `src/hooks/useOperationsData.ts` — expor `rawTratativas` no retorno do `useQuery` (não-breaking, só adiciona campo).

## Fora de escopo
- `useIndicators26Raw` e colunas 2025 da planilha.
- Outros componentes que consomem `useOperationsData` (não muda contrato existente).
