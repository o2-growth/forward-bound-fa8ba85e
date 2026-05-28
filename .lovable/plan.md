## Objetivo

Remover o card "G4" (ID Pipefy `1342531906`) das vendas do mês passado — e, por consequência, de qualquer métrica que conte cards Pipefy (vendas, funil, MQL, monetários de Expansão).

## Diagnóstico

- O projeto já tem uma lista fixa de IDs em `src/hooks/useModeloAtualMetas.ts` (`TEST_CARD_IDS` + função `isTestCard`) — é o mecanismo padrão de exclusão (memory core: "Test cards are excluded from all metrics via fixed ID list in 'isTestCard'").
- Hoje `isTestCard` é aplicado em **Modelo Atual** (MQL count). Não está sendo aplicado em **Expansão** (`useExpansaoAnalytics.ts`), que é onde um card G4 (canal eventos / Expansão) entra na contagem de vendas, MRR, Setup, Pontual e funil.
- Modelo Atual e O2 TAX puxam **receita** do Oxy Finance API (não do card Pipefy), então excluir o ID lá não afeta MRR/Setup realizado. Mas afeta MQL/funil/contagem de vendas, que é o pedido.
- Expansão puxa receita **diretamente dos campos do card** (`Valor MRR`, `Valor Setup`, `Valor Pontual`, `Taxa de franquia`) — adicionar exclusão no loop de `cards` zera a contribuição do G4 em todos os monetários e no funil Expansão.

## Mudanças

### 1. `src/hooks/useModeloAtualMetas.ts`
Adicionar `'1342531906'` ao `TEST_CARD_IDS` (linha 57).

### 2. `src/hooks/useExpansaoAnalytics.ts`
- Importar `isTestCard` de `./useModeloAtualMetas`.
- No loop de construção de `cards` (linha ~291) e `fullHistory` (linha ~306), pular `if (isTestCard(String(row['ID'])))`.
- Isso garante que o G4 não entre em: vendas Expansão, funil Expansão, MRR/Setup/Pontual Expansão, drill-downs.

### Fora de escopo
- Não mexer em Pipefy.
- Não mexer em Oxy Finance / `sales_realized` (Modelo Atual e O2 TAX usam fontes externas; o card G4 é Expansão segundo padrão de naming).
- Não criar UI de administração de exclusões (continua via lista fixa, como hoje).

## Validação

- Abrir Dashboard → Comercial → BU Expansão no mês passado: verificar que a venda do G4 sumiu (contagem -1, valores monetários reduzidos).
- Funil Expansão do mês: G4 não aparece nas fases.
- Build passa sem erro.
