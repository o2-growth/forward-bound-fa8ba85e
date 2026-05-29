## Causa raiz

`useJornadaData` aplica `CFO_NAME_NORMALIZE` ao ler `CFO Responsavel` do Pipefy — então `c.cfo` (o que cada cliente carrega) é o nome **curto**. Já o `cfo_user_mapping.cfo_name` foi gravado com o nome **longo** (igual ao Pipefy). Quando o CFO loga, `useMyCfoName` retorna o nome longo, o `CustomerSuccessTab` trava `filters.cfos = [longo]`, e nenhum cliente bate.

## Casos afetados (4)

| user_id (email) | cfo_name atual (longo) | corrigir para (curto) |
|---|---|---|
| `adivilso@…` (Oliveira) | Adivilso Souza de Oliveira Junior | **Oliveira** |
| `douglas.schossler@…` | Douglas Pinheiro Schossler | **Douglas Schossler** |
| `gustavo@…` (Cochlar) | Gustavo Ferreira Cochlar | **Gustavo Cochlar** |
| `rafael@…` (Bokorni) | Rafael Marchioretto Bokorni | **Rafael Marchioretto** |

Já estão corretos (não mexer): Eduardo D'Agostini, Everton Bisinella, Mariana Luz da Silva, Joseane Sartori, Eduardo Milani Pedrolo.

## Execução

1. `UPDATE cfo_user_mapping` nas 4 linhas acima trocando o `cfo_name` pro nome curto (via insert tool).
2. Validar com `SELECT` mostrando os 9 mappings atualizados.
3. Não precisa mexer em código — o normalize map já existe e os clientes seguem com o nome curto.

## Risco

Se amanhã alguém adicionar/renomear um CFO no mapa `CFO_NAME_NORMALIZE` sem atualizar o `cfo_user_mapping`, volta a quebrar. Posso opcionalmente trocar `get_my_cfo_name` por uma função que aplique a mesma normalização server-side — mas isso é refactor, faço só se quiser. Por ora, corrijo os 4 registros.
