## Atualizar metas de Closers para Maio/2026

Vou inserir/atualizar as metas absolutas em `closer_absolute_metas` (mês "Mai", ano 2026) para os 3 closers da imagem:

| Closer          | RM  | RR  | Prop | Venda | Faturamento |
|-----------------|-----|-----|------|-------|-------------|
| Daniel Trindade | 119 | 101 | 91   | 14    | R$ 300.000  |
| Amanda Serafim  | 44  | 37  | 33   | 5     | R$ 50.000   |
| Thiago          | 44  | 37  | 33   | 5     | R$ 50.000   |

### Observações
- A tabela `closer_absolute_metas` **não tem campo de ticket médio** (R$ 22k / R$ 10k da planilha). O ticket médio aparece como referência apenas (Faturamento ÷ Venda), e o sistema já calcula isso. Se quiser persistir ticket médio também, preciso criar uma nova coluna — me avise.
- Demais closers (Pedro Albite, Lucas Ilha, Bruna) **não vêm na imagem**, então mantenho os valores atuais deles intactos.
- Operação: UPSERT por `(closer, month, year)` — sobrescreve se já existir Maio/2026, insere se não.

Sem mudanças de código — apenas dados.