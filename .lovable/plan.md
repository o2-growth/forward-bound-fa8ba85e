## Ajustar benefícios da Tainara para R$ 624,20

Em `src/components/planning/jornada/CfoView.tsx`, linha 61, atualizar o valor de `beneficios` da Tainara Sofia Konzen:

| Antes | Depois |
|---|---|
| `beneficios: 90` | `beneficios: 624.20` |

### Efeito

O custo de benefícios do squad da Tainara aumenta em R$ 534,20 (de 90 para 624,20), refletindo automaticamente:
- Total de benefícios do squad
- Custo total (fee + benefícios)
- Margem e P&L do card/dialog do CFO da Tainara

### Arquivos alterados

- `src/components/planning/jornada/CfoView.tsx` — apenas o valor `beneficios` da Tainara