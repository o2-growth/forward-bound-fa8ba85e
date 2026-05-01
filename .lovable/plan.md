## Ajustar fee do Anderson para R$ 6.933,33

Em `src/components/planning/jornada/CfoView.tsx`, linha 80, no squad do Everton Bisinella, alterar o `fee` do Anderson Felizardo Mendes:

| Antes | Depois |
|---|---|
| `fee: 0` | `fee: 6933.33` |

### Efeito

O custo total do squad do Everton aumenta em R$ 6.933,33, refletindo automaticamente nos cálculos de margem e P&L do card/dialog do Everton.

### Arquivos alterados

- `src/components/planning/jornada/CfoView.tsx` — apenas o valor `fee` do Anderson
