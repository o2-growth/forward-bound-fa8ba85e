## Objetivo
Reclassificar os leads do evento **G4-Aula-Traction-02/07/2026** no dashboard G4 Real: em vez de contarem como **Inscritos**, eles devem contar apenas como **Levantaram a Mão**. Não temos dados de inscrição nem de presença para esse tipo de evento.

## Mudanças

### 1. Edge Function `g4-metrics`
Ao montar as métricas do funil por live:
- Detectar eventos de traction pelo nome da live (padrão: contém `Traction`, case-insensitive, após normalização).
- Para essas lives:
  - `inscritos = 0`
  - `presentes = 0`
  - `levantaram_mao = <total de leads daquele evento>` (o número que hoje aparece como 16 inscritos vira 16 levantaram a mão)
  - `vendas` permanece como está (vindo da base)
- Lives normais (não-traction) continuam com a lógica atual, sem alteração.

### 2. Agregados globais do funil
Os totais consolidados (soma de todas as lives) passam a refletir a nova classificação automaticamente, já que somam os campos por live.

### 3. Frontend (`G4RealSection.tsx`)
- Nenhuma mudança de layout necessária — os cards já leem `inscritos`, `presentes`, `levantaram_mao`, `vendas` da API.
- Opcional (confirmar): adicionar um pequeno rótulo `(Traction)` ao lado do nome da live no funil para deixar claro por que inscritos/presentes estão zerados. **Incluído por padrão no plano; remover se não quiser.**

### 4. Tabela de leads
Sem mudança. Os leads do evento continuam aparecendo normalmente quando filtrados pela live correspondente.

## Fora de escopo
- Nenhuma alteração de schema no banco externo.
- Nenhuma mudança em KPIs de outras BUs.
- Nenhuma mudança nas queries SQL de origem — a reclassificação acontece na camada da Edge Function.

## Validação
- Chamar `g4-metrics` via curl e conferir que a live `G4-Aula-Traction-02/07/2026` retorna `inscritos: 0`, `presentes: 0`, `levantaram_mao: 16`.
- Conferir que as outras lives (não-traction) mantêm seus números originais.
