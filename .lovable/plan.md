## Atualizar metas no diálogo do CFO

Em `src/components/planning/jornada/CfoView.tsx` (linhas 119-123), alterar apenas:

```ts
const TARGETS = {
  clientesPerSquad: 10,   // → 15
  ticketMedio: 7915,      // (mantém)
  margemTarget: 56,       // → 65
};
```

### Efeito visual
Quando o usuário clica num card de CFO, os mini-cards do diálogo passam a usar:
- **Clientes do Squad**: Meta 15 (antes 10) — número fica verde se ≥15, amarelo se <15
- **Margem Bruta**: Meta 65% (antes 56%) — fica verde se ≥65%, amarelo se <65%

### Arquivos alterados
- `src/components/planning/jornada/CfoView.tsx` — apenas as 2 linhas do objeto `TARGETS`
