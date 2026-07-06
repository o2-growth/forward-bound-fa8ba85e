
## Objetivo
Atualizar metas por Closer e por SDR de Jul/2026 (Modelo Atual) com os valores da planilha, garantindo backup para rollback rápido e sem afetar outros números.

## Segurança / Rollback

Antes de qualquer UPDATE, criar snapshot em tabelas de backup dedicadas (não migração de schema — insert simples via CREATE TABLE AS, feito no mesmo lote):

- `closer_absolute_metas_backup_20260706_jul` — cópia das 6 linhas de Jul/2026 antes do update
- `sdr_metas_backup_20260706_jul_modelo_atual` — cópia das 5 linhas de Jul/2026 modelo_atual antes do update

Rollback = 1 comando UPDATE lendo do backup. Deixo o SQL de rollback pronto no chat após aplicar.

## Escopo (o que MUDA)

### `closer_absolute_metas` (apenas linhas Jul/2026 destes 3 closers)

| Closer | rm_meta | rr_meta | prop_meta | venda_meta | faturamento_meta |
|---|---:|---:|---:|---:|---:|
| Daniel Trindade | 87 | 74 | 67 | 10 | **220000** (era 200000) |
| Amanda Serafim | 70 | 59 | 53 | 8 | 100000 (mantém) |
| Thiago | 87 | 74 | 67 | 10 | 200000 (mantém) |

Bruna, Lucas Ilha, Pedro Albite → **não toco** (permanecem zerados como estão hoje).

### `sdr_metas` (apenas Carlos, Jul/2026, modelo_atual)

| SDR | rm_meta | rr_meta |
|---|---:|---:|
| Carlos | 179 | 140 |

Ana, Amanda, Erica, Matheus → **não toco**.

## O que NÃO MUDA (para não "foder outros números")

- `funnel_metas` (RM/RR/Proposta/Venda consolidados da BU) — intocado
- `monetary_metas` (faturamento/pontual da BU) — intocado
- `closer_metas` (tabela de rateio %) — intocada
- Metas de outros meses, outras BUs, outros closers/SDRs — intocados
- Nenhuma alteração de schema, código, hooks ou lógica

## Passos
1. Criar as 2 tabelas de backup com `CREATE TABLE ... AS SELECT ...` filtrado.
2. Rodar os UPDATEs listados acima (7 linhas no total: 3 closers + 1 SDR + snapshots).
3. Confirmar via SELECT que os novos valores bateram com a planilha.
4. Postar no chat o SQL de rollback exato, para o usuário guardar.

## Não incluído nesta etapa
- Meta de faturamento incremento (Total 520k / MRR 130k / Setup 390k) — envolve `funnel_metas` e/ou `monetary_metas` que são globais da BU e afetam gauges/dashboards. Trato numa segunda etapa separada com o mesmo padrão de backup, depois de você confirmar.
