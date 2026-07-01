## Problema

Na aba **G4 › Eventos**, os valores estão inflados (ex.: MQL 202 vs Leads 70, Vendas 9) porque a classificação da frente Eventos é frouxa demais e captura cards que não têm sinal de G4 na origem.

Causa raiz em `src/lib/g4Events.ts` → `matchEventoFromCard`:

1. **Fallback ±7 dias**: qualquer card cuja `dataEntrada` cai a até 7 dias de uma data de evento G4 é classificado como "eventos", **mesmo sem nenhum token G4** em `origemLead / campanha / tipoOrigem / fonte`. Como temos 3 eventos em Mai–Jun, essa janela cobre boa parte do período e "puxa" cards aleatórios.
2. **Tokens genéricos**: `"g4 talks"` bate em qualquer campanha com "g4 talks", mas o haystack não exige que o campo seja realmente de origem/campanha G4 — basta a substring.

Resultado: o funil de Eventos conta cards que não têm origem G4 nenhuma; e o `buildDre` soma `valor` dos cards em Ganho/Contrato assinado dessa lista inflada → **Vendas e Receita Bruta de Eventos ficam falsas**.

## Solução

Endurecer a classificação de Eventos para exigir sinal explícito de G4 nos campos de atribuição do card. Alinhar com a regra que já usamos em `src/lib/leadSource.ts` (qualquer sinal contendo "g4" → Evento).

### Mudanças

**1. `src/lib/g4Events.ts`**
- Adicionar guard em `matchEventoFromCard`: só entra na função se o haystack do card contiver o token `"g4"` (normalizado). Sem sinal G4 → retorna `null` imediatamente.
- **Remover o fallback ±7 dias**. Passa a classificar apenas por match de token nos campos de origem/campanha/fonte. O desempate por data mais próxima anterior (para "G4 TOOLS CONNECT" que aparece 06/05 e 30/06) é mantido.
- Efeito: `isCardEvento` e `classifyG4Card` só retornam "eventos" quando o card realmente tem G4 em algum campo de atribuição.

**2. `src/hooks/useG4Analytics.ts` (defesa em profundidade)**
- Em `buildDre`, filtrar `repCards` também por `VENDA_FASES` **e** garantir que só somamos `valor` de cards já classificados na frente (o que já acontece, mas fica coerente após o aperto do classificador).
- Nenhuma mudança de assinatura — apenas os números caem para o valor real.

**3. Nada muda em Lives / Seller**
- `isCardLive` já exige "live" + "g4" no haystack.
- `isCardSeller` já exige `origemLead === "g4 seller"` ou `paginaOrigem` com `tools.g4business.com`.

### Validação após implementação

- Rodar Playwright: abrir `/planning-2026` → aba Indicadores → sub-aba G4 → seção Eventos, com filtro Jun/2026, e conferir:
  - Leads Captados ≤ Leads do funil (não pode ter MQL > Leads como está hoje).
  - Vendas do funil e Receita Bruta do P&L refletem só cards com origem G4 (spot-check no DB com `query_external_db` filtrando por `origemLead ILIKE '%g4%' OR campanha ILIKE '%g4%'`).
- Comparar com a contagem de cards G4 no Pipefy (~618 em Jun/2026, dos quais só 3 têm receita qualificável) — Vendas de Eventos deve cair drasticamente.

### O que NÃO muda

- Regras de MQL por faturamento (Modelo Atual ≥ 200k, O2 TAX ≥ 500k) — permanecem no `useModeloAtualAnalytics`.
- Configuração de eventos, custos, comissão G4, imposto.
- Lives e Seller.
