# Produto "A definir" nos acelerômetros — manter comportamento atual

## Diagnóstico

Verifiquei no banco externo (`pipefy_moviment_cfos`) o preenchimento do campo "Produtos" e dos campos auxiliares de produto, filtrando por `Entrada >= 2026-01-01`:

| Fase Atual | Total | Produtos | Plano CFOaaS | Plano Oxy | Valor Setup |
|---|---:|---:|---:|---:|---:|
| Reunião agendada / Qualificado | 92 | 0 | 0 | 0 | 0 |
| Reunião 2 agendada | 20 | 0 | 0 | 0 | 0 |
| Reunião Realizada | 154 | 0 | 0 | 0 | 1 |
| Tentativas de contato | 73 | 0 | 0 | 0 | 0 |
| Proposta enviada / Follow Up | 311 | 0 | 0 | 0 | 237 |
| Contrato em elaboração | 57 | 0 | 0 | 0 | 42 |
| Contrato assinado | 10 | 0 | 0 | 0 | 10 |
| Ganho | 678 | 0 | 27 | 0 | 545 |

**Conclusão:** o campo "Produtos" está **100% vazio** em todas as fases (até mesmo em Ganho). O produto só é inferível indiretamente via "Valor Setup"/"Valor CFOaaS"/"Plano CFOaaS" — e mesmo esses campos só começam a ser preenchidos a partir de Proposta enviada.

Para cards em Reunião agendada, RR, Tentativas, RR2, o produto **realmente não está no Pipefy** — o lookup em `pipefy_db_clientes` (que tem ~293 clientes ativos) só acerta quando o título do card prospect coincide com algum cliente já fechado, o que é raro.

## Decisão (confirmada com o usuário)

Manter "A definir" como está — é o estado real do Pipefy. A correção é operacional, não de código: o time precisa preencher o campo Produtos / Plano CFOaaS / Plano Oxy Finance no card do Pipefy para o produto aparecer categorizado nos acelerômetros.

## Mudanças

Nenhuma mudança de lógica ou de banco. Apenas dois ajustes leves de UX para deixar claro que "A definir" reflete o Pipefy:

1. **`src/components/planning/indicators/DetailSheet.tsx`** — na coluna/badge "Produto", quando o valor for "A definir" adicionar um tooltip: *"Campo 'Produtos' não preenchido no Pipefy. Preencha no card para categorizar."* Sem mudança de cor ou estrutura.

2. **`src/lib/productClassifier.ts`** — adicionar comentário no topo explicitando que "A definir" significa literalmente "Pipefy vazio" e listando os campos consultados em ordem (Produtos → fallback via `pipefy_db_clientes`), para futuras dúvidas.

## Validação

- Acelerômetro → clicar em RM/RR/Proposta de Modelo Atual: cards continuam aparecendo como "A definir" (correto), agora com tooltip explicativo.
- Cards em Ganho que têm correspondência em `pipefy_db_clientes` continuam categorizados normalmente (CaaS, OXY, etc.).
- Nenhuma quebra em totais monetários ou em outras BUs.
