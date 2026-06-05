## Objetivo

Fechar a etapa de Cohort/Curva/Online-Offline/CAC garantindo que (1) toda fonte real do Pipefy está classificada explicitamente como online ou offline, (2) "venda" segue a regra universal de entrada em Contrato assinado/Ganho, e (3) test cards estão fora.

## Passo 1 — Auditar fontes reais (script de diagnóstico, NÃO entra no app)

Rodar uma query única via Edge Function `query-external-db` (action `preview`, limit 5000) em 4 tabelas:

- `pipefy_moviment_cfos` (Modelo Atual)
- `pipefy_moviment_outbound` (Outbound)
- `pipefy_cards_movements` (O2 TAX)
- `pipefy_cards_movements_expansao` (Franquia + Oxy Hacker — separar por campo `Produto`)

Extrair tripla `Fonte | Origem do lead | Tipo de Origem do lead`, deduplicar por `ID`, e listar todas as combinações distintas com contagem.

Saída: relatório em `/mnt/documents/fontes-audit.csv` com colunas `bu, fonte, origem_lead, tipo_origem, count, classificacao_atual`.

## Passo 2 — Atualizar `src/lib/marketingChannelGroup.ts`

Substituir a lista de tokens por um mapeamento explícito baseado na auditoria:

```ts
const ONLINE_FONTES = new Set([...]);   // fontes literais
const OFFLINE_FONTES = new Set([...]);  // fontes literais
const ONLINE_TOKENS = [...];            // fallback por substring para fontes novas
const OFFLINE_TOKENS = [...];
```

Regra:
1. Match exato (normalizado) em `ONLINE_FONTES` / `OFFLINE_FONTES` → ganha
2. Caso contrário, fallback por substring (lista atual)
3. Última camada: heurística pelo nome de campanha (`Campanha` começa com número/UTM → online)
4. Sobrou: `desconhecido`

Tokens conhecidos hoje que precisam entrar (do código atual + Indicadores 26): `meta ads, facebook, instagram, google ads, googleads, site, site/redes sociais, redes sociais, linkedin, matéria exame, globo internacional, youtube, organic, direct, podcast, blog` (online) e `colaborador o2, ind. parceiro, ind. prospect, já era cliente, prosp. ativa, outbound, evento, indicação cliente, indicação fornecedor` (offline). A lista final sai do Passo 1.

## Passo 3 — Painel "Fontes sem classificação" no dashboard

Novo bloco no fim de `OnlineOfflineSection.tsx`, só aparece se houver pelo menos 1 fonte `desconhecido`:

```
┌─ Fontes sem classificação (N) ──────────────────────────┐
│ Fonte                       BU          Leads   Vendas  │
│ <nome bruto>                Modelo A.   12      1       │
│ ...                                                     │
│ Tooltip: "Adicione em marketingChannelGroup.ts"         │
└─────────────────────────────────────────────────────────┘
```

Isso garante visibilidade futura quando aparecer fonte nova.

## Passo 4 — Mudar definição de venda

Hoje `salesInPeriod` filtra `card.dataAssinatura dentro do dateRange`. Trocar para a regra universal já memorizada:

- Venda = card que entrou em fase `Contrato assinado` ou `Ganho` (normalizada) dentro do período
- Usar `dataAssinatura` apenas como referência de display

Em `MarketingIndicatorsTab.tsx`, substituir o `useMemo` de `salesInPeriod` por uma helper compartilhada que respeita `sales-phase-universal-definition` + `sales-date-prioritization-logic` (prioriza `Data de assinatura do contrato` quando preenchida, senão data de entrada na fase). Isso já existe em vários hooks — vou centralizar em `src/lib/salesRecognition.ts` e reusar.

## Passo 5 — Excluir test cards

Importar `isTestCard` (já existente) e aplicar nos 3 datasets feed das seções novas:
- `allAttributionCards`
- `leadsAttributionCards`
- `salesInPeriod`

## Passo 6 — Validar números

Após o build, comparar com `Indicadores Growth.xlsx` (período abr/2026 ou outro fechado) para:
- CAC total
- Online/Offline split (leads + vendas + conversão)
- Média/Mediana dias até fechar
- Cohort de Entrada e Assinatura (mês a mês)

Se algum bater fora, registrar a divergência junto ao painel "Fontes sem classificação" pra discutir antes de mexer em fórmula.

## Arquivos afetados

```
src/lib/marketingChannelGroup.ts          (reescrita do mapper)
src/lib/salesRecognition.ts               (NOVO — helper compartilhado)
src/components/planning/MarketingIndicatorsTab.tsx   (salesInPeriod + isTestCard)
src/components/planning/marketing-indicators/OnlineOfflineSection.tsx   (painel desconhecido)
/mnt/documents/fontes-audit.csv           (artefato de auditoria)
```

## Notas técnicas

- Memória a atualizar: `mem://features/marketing/cohort-curva-online-offline-cac` com nova definição de venda + isTestCard.
- Sem alteração em edge functions, metas, ou DB schema.
- O painel de desconhecido é o seguro: se aparecer fonte nova depois, dá pra reclassificar em 1 PR sem mexer no resto.
