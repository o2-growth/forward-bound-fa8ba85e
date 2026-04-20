

User quer lista nominal dos cards divergentes COM link do Pipefy, card a card. Já fiz comparação antes mas só entreguei sumário. Preciso re-executar em modo padrão.

## Listar cards divergentes com link do Pipefy

### O que vou fazer

1. Re-copiar os 3 xlsx de `user-uploads://` para `/tmp/`.
2. Cruzar com banco via `query-external-db`:
   - RM/RR Franquia → `pipefy_cards_movements_expansao` (pipe Expansão)
   - MQL Modelo Atual → `pipefy_cards_movements` (pipe Modelo Atual)
3. Identificar cards do export ausentes no sistema e classificar motivo:
   - **RM/RR**: `sem_movimento_para_fase` | `pulou_fase_direto` | `card_de_teste` | `mes_diferente_dedup`
   - **MQL**: `faixa_faturamento_abaixo_200k` | `motivo_perda_excluido` | `card_de_teste`
4. Gerar link Pipefy: `https://app.pipefy.com/pipes/{pipeId}#cards/{cardId}` (preciso descobrir pipeId Modelo Atual e Expansão — já tenho NPS/Central/Tratativas, falta confirmar via consulta).

### Output (no chat)

Três tabelas markdown, uma por indicador:
```
| Título | Fase Atual | Motivo | Link |
|--------|------------|--------|------|
| Empresa X | Lead | sem_movimento_para_fase | [#123](https://app.pipefy.com/pipes/.../cards/123) |
```

Limite 50 por indicador. Se exceder, agrupo o resto por motivo.

### Não vou
- Alterar código.
- Gerar arquivo CSV.
- Repetir sumário estatístico.

