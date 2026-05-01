## Ajustar fee dos estagiários para R$ 1.500

Em `src/components/planning/jornada/CfoView.tsx`, no array `SQUADS`, alterar o campo `fee` de `0` para `1500` nestes 3 membros:

| Linha | Membro | Squad |
|---|---|---|
| 72 | Pedro Oppermann Michelucci (Estagiário FP&A) | (squad linha 66) |
| 81 | Maria Eduarda Nery Reckziegel (Estagiária FP&A) | (squad linha 77) |
| 107 | Raissa Bonamigo Daros (Estagiária FP&A) | (squad linha 103) |

### Efeito
O custo total do squad (`sq.fee + Σ membros.fee + benefícios`, linha 218-220) passa a incluir +R$ 1.500 por estagiário, refletindo automaticamente nos cards/dialogs de margem dos respectivos CFOs.

### Arquivos alterados
- `src/components/planning/jornada/CfoView.tsx` — apenas o valor `fee` dos 3 membros
