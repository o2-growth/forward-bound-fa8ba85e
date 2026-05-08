## Objetivo
Aplicar 3 correções no `SYSTEM_PROMPT` da edge function `analyze-cliente-360` para eliminar erros factuais, formatação ruim e inconsistências matemáticas detectadas no teste com 5 clientes.

## Correções

### 1. Anti-alucinação em datas/durações (corrige Mundim & Co "1 ano e 9 dias")
Adicionar regra explícita:
- "Tempo de casa" deve ser calculado SOMENTE a partir de campos de data presentes no JSON (criação do card, entrada em fase). Se não houver data confiável, escrever "n/d".
- Proibido estimar duração em "anos", "meses" sem campo de data correspondente. Sempre citar a data-base usada como evidência.

### 2. Tratamento de campos vazios (corrige "Setup: n/d + n/d + n/d")
Nova regra de formatação:
- Se TODOS os subcampos de um item da Situação Atual forem ausentes/n/d, escrever apenas: `**Setup:** n/d (sem dados no JSON)` — uma única vez, sem concatenar múltiplos "n/d".
- Para NPS sem respostas: `**NPS:** sem respostas registradas` (não listar média/tendência/dias).
- Para próximo check-in n/d em cliente 🟢: substituir por "Manter cadência atual. Sem ações requeridas." (remover a frase "Próximo check-in" quando não houver data).

### 3. Validação matemática (corrige Mineração 5/5 = 80%)
Nova regra:
- Percentuais de participação devem ser calculados como (realizadas / previstas) × 100 com base nos números explicitados no mesmo bullet. Proibido citar percentual que contradiga os números mostrados.
- Se previstas = realizadas, escrever "100%" sem exceções.

### 4. Bloco "Conta" — incluir MRR/Setup quando disponível
Adicionar ao bullet `**Conta:**`: + MRR ativo + valor de Setup (se presentes no JSON), pois Head de CS precisa do contexto financeiro do cliente em operação ou churn.

## Detalhes técnicos
- Editar somente o `SYSTEM_PROMPT` (linhas 10–53) em `supabase/functions/analyze-cliente-360/index.ts`.
- Redeploy via `supabase--deploy_edge_functions`.
- Validar rodando os mesmos 5 clientes (Mundim, ARA, BIDChain, Raizs, Mineração) e comparar:
  - Mundim: tempo de casa correto (~4 meses) + MRR/Setup citados
  - Mineração: participação 100% (não 80%)
  - Raizs/BIDChain: bloco Setup/NPS limpo sem "n/d + n/d + n/d"
  - 🟢 sem "Próximo check-in: n/d"

## Fora de escopo
- Mudanças na função `get_cliente_360` (estrutura de dados). Se após as correções persistir falta de campos críticos, abrir nova rodada para enriquecer o payload.