## Problema

Hoje `matchLiveFromCard` (em `src/lib/g4Events.ts`) começa com `if (!hasG4Signal(card)) return null;`. Isso descarta leads cuja `origemLead`/`campanha`/`paginaOrigem` menciona a data da live (ex: "Live 20/05", "20/05/2026") mas não contém a string "g4" nem URL em domínio g4. Resultado: drill-down das lives fica com pouquíssimos cards.

## Correção

### `src/lib/g4Events.ts` — `matchLiveFromCard`

1. **Remover a exigência de `hasG4Signal` como gate inicial.** A função vira: tenta match textual por data/label primeiro; se casar, retorna a live (mesmo sem sinal G4 explícito, porque a menção à data já é a atribuição).
2. **Reforçar tokens de data** para reduzir falso-positivo:
   - Manter `dd/mm`, `dd-mm`, `YYYY-MM-DD`, `norm(live.label)`.
   - Trocar `dd mm` (muito frouxo, casa "20 05" em qualquer texto) por tokens mais seguros: `dd/mm/yyyy`, `d/m` sem zero à esquerda, e a palavra `live` combinada com `dd/mm` já coberta pelo label.
   - Exigir que o token de data apareça **em conjunto com a palavra `live`** no haystack quando não houver sinal G4 (evita casar cards não-G4 que só têm a data por coincidência). Se `hasG4Signal(card)` for true, aceita só a data.
3. **Fallback de janela de captura** continua exigindo `hasG4Signal` (senão qualquer lead do período entraria na live).

### Escopo em `LivesSection.tsx`

O escopo atual filtra `liveCards` (cards que passaram por `isCardLive`). Com a mudança acima, cards que casam por texto+live mas falham em `isCardLive` (sem "live"/"g4" no haystack) ainda precisam entrar. Ajuste:

- Trocar `scope` no dialog para partir de **todos os `cards`** (não só `liveCards`) e filtrar por `matchLiveFromCard(...) !== null` — a nova versão da função já é o critério correto de "é card de alguma live".

## Fora de escopo

- Não altera `isCardLive`, `classifyG4Card`, métricas agregadas nem overrides oficiais.
- Não mexe em Eventos nem Seller.
- Só afeta a **listagem do drill-down** de Lives; contagens `inscritos/entraram/mao/venda` do funil continuam vindo do override oficial + cálculo atual.
