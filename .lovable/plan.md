## Atualizar benefícios do squad do Dago (Eduardo Milani Pedrolo)

Ajuste pontual em `src/components/planning/jornada/CfoView.tsx` no objeto `CFO_SQUADS`, dentro do squad `'Eduardo Milani Pedrolo'`.

### Valores atuais → novos

| Membro | Atual | Novo |
|---|---|---|
| Felipe Vargas Brenner | R$ 300 | **R$ 690** (390 alimentação + 300 Raiô) |
| Eric Alves da Silveira | R$ 360 | **R$ 600** (300 deslocamento + 300 Raiô) |
| Pedro Oppermann Michelucci | R$ 300 | **R$ 889** (589 base + 300 Raiô) |
| Sergio Pereira Piva Junior | R$ 990 | mantém |

### Mudança técnica

Linhas 70-72 do arquivo, atualizar apenas o campo `beneficios`:

```ts
{ nome: 'Felipe Vargas Brenner', cargo: 'Analista FP&A', fee: 7000, beneficios: 690 },
{ nome: 'Eric Alves da Silveira', cargo: 'Analista Financeiro', fee: 7000, beneficios: 600 },
{ nome: 'Pedro Oppermann Michelucci', cargo: 'Estagiário FP&A', fee: 1500, beneficios: 889 },
```

### Impacto

- O P&L do squad do Dago e o card de "Benefícios (desloc. + alim. + Raiô)" recalcularão automaticamente via `getSquadBeneficios`, refletindo o novo total de benefícios e nova Margem Bruta.
- Nenhum outro squad é afetado.