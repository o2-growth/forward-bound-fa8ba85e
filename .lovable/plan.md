

User quer a lista nominal dos cards divergentes com motivo. Já fiz a comparação antes mas entreguei só sumário. Preciso re-executar (modo padrão) lendo os 3 xlsx + cruzando com banco e listar card a card no chat.

## Listar cards divergentes (nome + motivo) — RM, RR e MQL

### O que vou fazer

1. Re-copiar os 3 xlsx de `user-uploads://` para `/tmp/`.
2. Para cada arquivo, extrair lista de cards (ID, Título, Fase Atual, Faixa de faturamento, Created at).
3. Consultar `pipefy_cards_movements_expansao` (RM/RR Franquia) e `pipefy_cards_movements` (MQL Modelo Atual) via edge function `query-external-db` para o mesmo período.
4. Para cada card do export, verificar se está sendo contado pelo sistema e classificar o motivo da exclusão:
   - **RM/RR Franquia**: `sem_movimento_para_fase` | `card_de_teste` | `mes_diferente_por_dedup` | `pulou_fase_direto`
   - **MQL Modelo Atual**: `faixa_faturamento_abaixo_200k` | `motivo_perda_excluido` (Duplicado/ICP fora/Não é demanda) | `card_de_teste` | `criado_fora_periodo`

### Output (no chat, sem CSV)

Três tabelas, uma por indicador, formato:
```
Título                     | Fase Atual              | Motivo
Empresa X                  | Lead/MQL                | sem_movimento_para_fase
Empresa Y                  | Perdido                 | sem_movimento_para_fase
...
```

Limite: até 50 cards por indicador. Se houver mais, aviso "+N cards adicionais com mesmo motivo".

### Não vou
- Alterar código.
- Gerar arquivo/CSV.
- Repetir o sumário estatístico.

