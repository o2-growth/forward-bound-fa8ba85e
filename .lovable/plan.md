## Contexto
Cards em qualquer pipe podem chegar com campos de origem preenchidos com **placeholders literais do Meta Ads não resolvidos** (o Meta não substituiu as variáveis por falta de parâmetros na URL). Exemplos observados:

- Fonte: `{{site_source_name}}`
- Posicionamento: `paid_social`
- Campanha: `{{campaign.name}}`
- Conjunto/grupo: `{{ad.name}}`

Hoje esses cards caem em **Sem origem** porque a heurística não reconhece os placeholders. Como o próprio placeholder já prova que o card veio de um anúncio pago (Meta Ads), devem contar como **Inbound**.

## Alteração
**Arquivo:** `src/lib/leadSource.ts`

1. Adicionar campo opcional `posicionamento?: string | null` ao `ClassifyInput` (novo sinal explícito do pipe).
2. Nova regra dentro do bloco INBOUND (regra 4), antes do fallback final:
   - Se **qualquer** um dos campos (`fonte`, `campanha`, `origemLead`, ou o novo `posicionamento`) contém padrão de placeholder Meta não resolvido — regex `/\{\{[^}]+\}\}/` — retorna `'inbound'`.
   - Se `posicionamento` (normalizado) contém `paid_social`, `paid social`, `facebook_feed`, `instagram_feed`, `stories`, `reels`, `audience_network`, `messenger` → `'inbound'`.
   - Se `fonte` normalizado === `site_source_name` (placeholder que virou literal após normalização) → `'inbound'`.

## Propagação
Passar `posicionamento` nas 3 chamadas existentes de `classifyLeadSource`, quando disponível no card:
- `src/components/planning/IndicatorsTab.tsx` (2 chamadas)
- `src/components/planning/ClickableFunnelChart.tsx` (1 chamada)

Uso: `posicionamento: (card as any).posicionamento ?? (card as any).placement`.

Se os hooks/tipos do card ainda não carregam esse campo, a checagem por placeholder em `fonte`/`campanha` já cobre a maior parte dos casos — nenhum trabalho de schema extra necessário para o MVP.

## Impacto
- Zero risco de regressão em outras origens: as novas condições só disparam com sinais **explícitos de Meta Ads** (placeholders literais ou tokens de placement).
- Cards que hoje aparecem em **Sem origem** por conta desses placeholders passam a aparecer em **Inbound** no filtro da aba Comercial.
- Não altera contagem total nem outras BUs — apenas realoca `sem_origem → inbound`.

## Verificação
Após implementar, abrir aba Comercial com filtro **Inbound** e conferir que cards com fonte `{{site_source_name}}` aparecem; e com filtro **Sem origem** que eles saíram.
