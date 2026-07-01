## Regra confirmada

- **G4 Eventos**: haystack (`origemLead | campanha | tipoOrigem | fonte`, normalizado) precisa conter `"g4"` **E** pelo menos 1 token de evento: `evento`, `summit`, `talkshow`, `talk show`, `imersao`, `presencial`, `webinar`, `palestra`, `workshop`, `speaker`, `4am`.
- **G4 Lives**: mantém regra atual (`"g4"` **E** `"live"` no haystack).
- **G4 Seller**: intocado.
- Prioridade continua: seller > lives > eventos.

## Mudança

**`src/lib/g4Events.ts`**
- Remover o uso de `classifyLeadSource` em `isCardEvento`.
- Reescrever `isCardEvento` para: normalizar os 4 campos, exigir presença de `"g4"` **E** de ao menos um token da lista de eventos acima. Sem depender de `matchEventoFromCard`.
- `matchEventoFromCard` permanece só para a tabela de detalhamento por evento configurado (sem fallback ±7d).
- Pode remover o `import { classifyLeadSource }` se não for mais usado no arquivo.

## Nada mais muda

- `useG4Analytics`, `EventosSection`, `LivesSection`, `SellerSection` continuam consumindo `classifyG4Card` — herdam a regra nova.
- Funil / DRE / Pipe da frente Eventos passam a refletir só cards com G4 + token de evento; devem ficar bem menores que o "filtro Eventos" do Indicador Comercial (que é mais amplo).
