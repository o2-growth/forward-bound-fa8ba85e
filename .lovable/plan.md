

Para listar cards divergentes preciso executar comparação card-a-card (Python + xlsx) — só funciona em modo padrão. Plano:

## Listar cards divergentes em RM, RR e MQL

### O que vou fazer

1. Reler os 3 xlsx em `/tmp` (já estão lá da execução anterior).
2. Para cada arquivo, consultar a tabela real `pipefy_cards_movements_*` via edge function `query-external-db` para obter o que o sistema **de fato conta** no mesmo período do export.
3. Cruzar por **ID do card** e classificar cada divergência com motivo específico:
   - **RM Franquia / RR Franquia**: cards no export ausentes no sistema → motivo será um destes:
     - `sem_movimento_para_fase` (card nunca entrou no movimento RM/RR registrado)
     - `card_de_teste` (ID em `isTestCard`)
     - `produto_diferente` (não é Franquia)
     - `mes_diferente` (sistema contou em outro mês via dedup)
   - **MQL Modelo Atual**: cards no export ausentes no sistema → motivo:
     - `faturamento_abaixo_200k` (faixa < R$ 200k)
     - `motivo_perda_excluido` (Duplicado, ICP fora, Não é demanda)
     - `card_de_teste`
     - `criado_fora_do_periodo`

### Output (na conversa, não em arquivo)

Tabela enxuta por indicador:
```
ID    | Título (curto)         | Fase atual            | Motivo da exclusão
12345 | Empresa X              | Lead                  | sem_movimento_para_fase
67890 | Empresa Y              | Perdido               | sem_movimento_para_fase
...
```

Limito a até 30 cards por indicador no chat. Se o usuário quiser todos, gero CSV.

### Arquivos/recursos necessários
- Modo padrão (para `code--exec` Python).
- Os 3 xlsx em `/tmp` (re-copio do `user-uploads://` se necessário).
- Edge function `query-external-db` action `query_period` (já existe).

### Não vou
- Alterar nenhum código do app.
- Gerar CSV (a menos que peça).
- Re-rodar o diagnóstico estatístico já entregue.

