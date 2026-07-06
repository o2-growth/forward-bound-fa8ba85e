# Cadastrar metas completas dos closers em Jun/2026

Atualizar `closer_absolute_metas` para Jun/2026 com os valores da planilha enviada. Os registros já existem no banco (com `faturamento_meta` correto); vou apenas preencher `rm_meta`, `rr_meta`, `prop_meta`, `venda_meta` que hoje estão zerados.

## Valores a gravar

| Closer (nome no DB) | RM | RR | Proposta | Venda | Faturamento |
|---|---|---|---|---|---|
| Daniel Trindade | 131 | 111 | 100 | 15 | R$ 330.000 (já ok) |
| Amanda Serafim | 70 | 59 | 53 | 8 | R$ 100.000 (já ok) |
| Thiago | 70 | 59 | 53 | 8 | R$ 100.000 (já ok) |

Interpretação da imagem: Amanda e Thiago têm cabeçalho sem "R.M" na planilha, mas o primeiro valor numérico (70) corresponde a RM (o mesmo padrão da linha do Daniel e batendo com a meta de conversão de 15%: 8/53 ≈ 15%).

## Ação técnica

UPDATE em `closer_absolute_metas` filtrando por `year=2026`, `month='Jun'` e cada `closer` (3 statements). Nenhuma outra tabela é tocada, nenhum código muda.

## Validação

- `SELECT` após o UPDATE confirmando os 4 campos por closer.
- No dashboard, ao filtrar Jun/2026 + closer Thiago (Modelo Atual), os medidores RM/RR/Proposta/Venda passam a mostrar meta > 0 (usando a lógica já implementada de `closer_absolute_metas`).
