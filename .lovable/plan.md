# Correção de datas invertidas no Dossiê de Churn

## Problema
O sync escreve `Finalização do contrato (último dia trabalhado)` em `pipefy_moviment_tratativas` invertendo dia/mês quando o dia ≤ 12. Isso faz clientes sumirem do filtro do mês correto (ex: 5 clientes que deveriam aparecer em Abril/2026 não aparecem).

## Solução
Heurística de correção aplicada **somente** no hook do dossiê de churn, usando como âncora a entrada na fase "Tratativa finalizada" do mesmo card (gerada pelo Pipefy, não afetada pelo bug).

## Mudanças

### `src/hooks/useOperationsData.ts`
1. Para cada tratativa com `Decisão Final = Churn Cliente`:
   - Ler `Finalização do contrato (último dia trabalhado)` como `YYYY-MM-DD` → componentes Y/M/D.
   - Buscar `phaseFinalizadaEntry` (data de entrada na fase "Tratativa finalizada" do mesmo título).
2. Aplicar correção apenas se **todas** as condições forem verdadeiras:
   - `M ≤ 12` **e** `D ≤ 12` (data ambígua).
   - Existe `phaseFinalizadaEntry`.
   - `|original − âncora| > 60 dias` **e** `|swap − âncora| < 60 dias`.
   - O swap é estritamente mais próximo da âncora.
3. Caso contrário, manter a data original.
4. Logar todas as inversões aplicadas com `[CHURN_DATE_FIX]` (título, original, corrigido, diff em dias).
5. Construir lista de churn a partir de `Decisão Final = Churn Cliente` (fonte canônica), enriquecendo com Central de Projetos para MRR, Setup, CFO, produto, link Pipefy.
6. `mesChurn` e `dataEncerramento` usam o valor corrigido. Filtros de período continuam usando `dataEncerramento`.
7. Manter dados históricos da Central de Projetos (Churn/Atividades/Desistência) sem tratativa registrada via hierarquia já existente.

### `src/components/planning/nps/ChurnDossierSection.tsx`
- Parsear `YYYY-MM-DD` como data local (evitar shift de timezone).

## Garantias
- **Escopo isolado:** apenas o dossiê de churn lê esse campo. Zero impacto em funil, vendas, MRR, etc.
- **Margem de segurança:** só inverte quando o ganho é claro (> 60 dias de diferença vs. âncora).
- **Fallback seguro:** sem fase "Tratativa finalizada", mantém original.
- **Genérico:** funciona para qualquer cliente/mês, sem hardcode.

## Validação pós-implementação
- Conferir Abril/2026: deve mostrar exatamente os 8 clientes do XLSX.
- Conferir Março e Maio/2026: nenhum cliente deve ter migrado para mês errado.
- Revisar logs `[CHURN_DATE_FIX]` no console.
