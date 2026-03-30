

## Diagnóstico: Listar os 16 cards de "Proposta Enviada" Franquia em março/2026

### Problema
O sistema mostra **16 propostas enviadas** para Franquia em março. O Pipefy exporta **5**. Precisamos identificar exatamente quais são os 16 e por que cada um está lá.

### Causa da diferença (já explicada antes)
O sistema conta **throughput** (todos os cards que ENTRARAM nas fases de proposta durante março), enquanto o Pipefy mostra **snapshot** (cards ATUALMENTE nessa fase). Cards que avançaram para Ganho/Perdido saem do Pipefy mas permanecem no sistema.

Além disso, o sistema agrega **3 fases** como "proposta":
- `Proposta enviada / Follow Up`
- `Enviar proposta`
- `Enviar para assinatura`

### Plano de ação

**Passo 1: Adicionar action `proposta_diagnosis` na edge function `query-external-db`**

Nova action que executa:
```sql
SELECT "ID", "Título", "Fase", "Fase Atual", "Entrada", "Saída", "Produtos",
       "Taxa de franquia", "Valor MRR", "Valor Pontual", "Valor Setup",
       "Closer responsável", "Motivo da perda"
FROM pipefy_cards_movements_expansao
WHERE "Produtos" = 'Franquia'
  AND "Fase" IN ('Proposta enviada / Follow Up', 'Enviar proposta', 'Enviar para assinatura')
  AND "Entrada" >= '2026-03-01T00:00:00'
  AND "Entrada" <= '2026-03-31T23:59:59'
ORDER BY "Entrada" ASC
```

Depois aplica a mesma deduplicação mensal do sistema (chave: `ID|Fase|Mês`) e retorna a lista completa com título, fase de entrada, fase atual e valor de cada card.

**Passo 2: Executar a query e gerar relatório**

Chamar a edge function e exibir os 16 cards com:
- ID, Título, Fase que entrou (qual das 3), Fase Atual (onde está agora), Data de entrada, Valor, Closer

Isso mostrará exatamente quais dos 16 já viraram venda, quais foram perdidos, e quais ainda estão em proposta (os 5 do Pipefy).

### Alteração
Apenas na edge function `query-external-db/index.ts` — adicionar a action `proposta_diagnosis` (similar à `mql_diagnosis` já existente).

