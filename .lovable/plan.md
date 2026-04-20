

User está certo: a comparação anterior só verificou se cards do export existem no banco com fase certa. Mas o pedido é o OPOSTO: comparar **count do export vs count do sistema** e mostrar quais cards ESTÃO no export mas NÃO estão sendo contados no dashboard pela lógica do sistema, **e vice-versa**.

Filtros do export Pipefy:
- **MQL Modelo Atual**: faturamento >= R$ 200k + criado neste mês (Abril/2026) + passou por qualquer fase de MQL+
- **RM Franquia**: primeira entrada na fase RM + criado neste mês
- **RR Franquia**: primeira entrada na fase RR + criado neste mês

Sistema (lógica atual):
- **MQL Modelo Atual** (`useModeloAtualMetas`): conta por **data de criação** + faixa qualificada + dedup mensal − motivos de perda líquidos
- **RM/RR Franquia** (`useExpansaoMetas`): conta por **data de entrada na fase** (não criação) + dedup mensal + funil cumulativo

A divergência principal não é card ausente, é **eixo temporal diferente**:
- Export usa "Created at" (data de criação)
- Sistema RM/RR Franquia usa "Entrada na fase"

Então preciso:

1. Carregar os 3 xlsx e extrair Title + Created at
2. Para cada arquivo, replicar EXATAMENTE a lógica do sistema para o mesmo período (Abril/2026, baseado na criação dos cards do export)
3. Listar:
   - Cards no export mas NÃO contados pelo sistema (com motivo)
   - Cards contados pelo sistema mas NÃO no export (com motivo)
4. Mostrar o número total de cada lado

## Comparar contagens export vs sistema (não só presença)

### O que vou fazer

1. Ler os 3 xlsx — extrair Title + Created at de cada card.
2. Definir período = Abril/2026 (baseado em Created at do export).
3. Para cada indicador, replicar a lógica do sistema (do hook correspondente) e gerar a lista de cards que o **dashboard contaria** nesse período.
4. Cruzar export ↔ sistema:
   - **Set A**: cards no export ausentes da contagem do sistema → motivo (eixo data, dedup, faixa, motivo perda, fase ausente)
   - **Set B**: cards na contagem do sistema ausentes do export → motivo (criado em outro mês mas entrou na fase em abril, etc.)

### Saída

Para cada indicador (RM, RR, MQL):
```
Export: N cards | Sistema: M cards | Divergência: |N-M|

Cards NO EXPORT mas SISTEMA NÃO conta (X):
| Título | Created at | Motivo | Link |

Cards NO SISTEMA mas EXPORT NÃO tem (Y):
| Título | Entrada na fase | Motivo | Link |
```

Limite 50 por lista; se exceder, agrupo por motivo no final.

### Não vou
- Alterar código.
- Gerar CSV.

