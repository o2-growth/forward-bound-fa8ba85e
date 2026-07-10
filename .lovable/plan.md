
## Diagnóstico

A função robusta que Modelo Atual usa para banir cards de teste é `isJunkCard` (em `src/hooks/useModeloAtualMetas.ts`). Ela combina duas checagens:

- `isTestCard(id)` — allowlist fixa de IDs conhecidos.
- `isTestByTitle(titulo, empresa, nome, contato)` — regex em título/empresa/contato: `teste`, `test`, `testing`, `asdf`, `qwerty`, `abc`, `xxx`, só dígitos 1-4 chars, só símbolos.

**Auditoria das BUs:**

| Hook | Filtro atual | Status |
|---|---|---|
| `useModeloAtualAnalytics` | `isJunkCard(card)` em todos os paths | ✅ OK |
| `useO2TaxAnalytics` | `isJunkCard(c)` no parse | ✅ (mas confirmar que MQL usa a lista filtrada) |
| `useMonetizacaoAnalytics` | `isJunkCard({id, titulo, empresa: cliente})` | ✅ (idem) |
| `useOutboundAnalytics` | `isJunkCard(c)` no parse | ✅ |
| **`useExpansaoAnalytics`** | **só `isTestCard(id)`** em 3 pontos (linhas 331, 347, 366) | ❌ **gap principal** |

Expansão perde todo card de teste cujo ID não esteja na allowlist fixa. Novos cards com título "teste", "abc", "123", etc. passam direto para MQL e demais indicadores.

## Correção

### 1. Expansão (fix principal)

Em `src/hooks/useExpansaoAnalytics.ts`, substituir as 3 chamadas `isTestCard(String(row['ID']))` por checagem baseada em `isJunkCard` usando **id + Título** do row:

```ts
// antes
if (isTestCard(String(row['ID'] || ''))) continue;

// depois
const _id = String(row['ID'] || '');
const _titulo = String(row['Título'] || '');
if (isJunkCard({ id: _id, titulo: _titulo })) continue;
```

Trocar import: `isTestCard` → `isJunkCard`.

### 2. Auditoria confirmatória (O2 TAX, Monetização, Outbound)

Passar rapidamente nos hooks para garantir que **todo path que gera contagem de MQL/indicadores** consome a lista já filtrada — não relê `rawRows` sem passar por `isJunkCard`. Se algum path escapar, aplicar `isJunkCard` também.

Especificamente verificar:
- `useO2TaxAnalytics`: paths de MQL usando `periodCards` e `signatureCards` (ambos já filtrados).
- `useMonetizacaoAnalytics`: agregação de fases usa `cards` já filtrado.
- `useOutboundAnalytics`: `cardsInPeriod` deriva de `cards` já filtrado.

Se todos os paths consomem só as listas filtradas, nenhuma mudança adicional é necessária além do fix em Expansão.

## Impacto

- **Só adiciona filtro** — cards de teste somem, cards reais permanecem.
- Meses passados: métricas de teste caem; nenhum card real é impactado.
- Sem mudança em metas, DRE, monetário ou lógica de negócio.

## Validação

1. Typecheck.
2. Abrir dashboard Expansão em Jul/2026 e confirmar sumiço dos cards de teste em MQL.
3. Spot-check O2 TAX / Monetização / Outbound: se ainda aparecer teste, é sinal de path não-coberto → aplicar filtro nesse ponto específico.

## Pergunta

Você viu cards de teste especificamente em **quais BUs**? (Expansão sozinha, ou também O2 TAX / Monetização / Outbound?) Isso ajuda a focar na etapa 2 sem precisar auditar tudo às cegas.
