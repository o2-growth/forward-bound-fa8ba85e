## Problema

Após o último ajuste, a frente **G4 › Eventos** zerou porque `matchEventoFromCard` só aceita cards que batem em tokens específicos de eventos configurados (`G4 TOOLS CONNECT`, `G4 TALKS`). Só que no Indicador Comercial, quando o usuário filtra origem = **Eventos**, aparece **qualquer card com "g4"** em `tipoOrigem / origemLead / fonte / campanha` — regra definida em `src/lib/leadSource.ts` (`classifyLeadSource → 'evento'`).

A frente G4 Eventos precisa **espelhar exatamente essa regra**.

## Solução

Trocar o predicado da frente Eventos para reusar `classifyLeadSource` — mesma fonte de verdade do Indicador Comercial.

### Mudanças

**1. `src/lib/g4Events.ts`**
- Importar `classifyLeadSource` de `./leadSource`.
- Reescrever `isCardEvento(card)` para retornar `classifyLeadSource({ tipoOrigem, origemLead, fonte, campanha }) === 'evento'`.
- Manter `matchEventoFromCard` só para atribuir o card a um evento específico da tabela de detalhamento (retorna `null` sem quebrar a classificação). Continua exigindo token G4 e sem o fallback ±7d.
- `classifyG4Card` mantém a prioridade **seller > lives > eventos**, mas "eventos" agora usa o predicado amplo.

**2. Nada mais muda**
- `useG4Analytics` continua chamando `classifyG4Card` — herda a nova regra automaticamente.
- `buildEventosRows` já usa `matchEventoFromCard`; cards que caem na frente mas não batem em nenhum evento configurado simplesmente não aparecem na tabela detalhada (KPIs agregados do funil/DRE continuam corretos).
- Lives e Seller intocados.

### Validação

- Abrir Indicadores › G4 › Eventos com filtro de Jun/2026.
- Comparar total de Leads Captados da frente Eventos com o total do Indicador Comercial filtrado por origem = Eventos → devem bater.
- Vendas / Receita do P&L de Eventos = soma de `valor` dos cards classificados como evento que estão em Ganho/Contrato assinado (mesmo universo do indicador comercial).
