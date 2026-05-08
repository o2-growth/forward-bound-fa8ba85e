## Objetivo

Corrigir o cálculo do **Fat Incremento** para o Modelo Atual em meses **não-lockados** (Mai em diante), que hoje mostram o Faturamento Meta Total (MRR Base + A Vender) em vez do Incremento puro (A Vender).

## Causa raiz

`src/hooks/useConsolidatedMetas.ts` → `getConsolidatedMeta`:
- **Meses lockados:** usa snapshot `funnel_metas.faturamento_vender` → correto.
- **Meses não-lockados:** lê `monetary_metas.faturamento`, que guarda o **total** (MRR Base + A Vender), tratando como se fosse Incremento.

Resultado em Maio: mostra R$ 1.100.152 (700k MRR Base + 400k A Vender) em vez de R$ 400.000.

## Mudança

Em `useConsolidatedMetas.ts`, no bloco de `getConsolidatedMeta`, antes do fallback `monetary_metas`, adicionar tratamento para **Modelo Atual em qualquer mês**:

1. Buscar o registro de `funnel_metas` daquele mês (Modelo Atual + ano).
2. Se existir e tiver `faturamento_vender > 0`, usar esse valor como Incremento (e os 25%/60%/15% derivados para mrr/setup/pontual).
3. Caso contrário, manter o fluxo atual (cai em `monetary_metas` ou Plan Growth).

Isso unifica a lógica: lockado ou não, Incremento do Modelo Atual = `funnel_metas.faturamento_vender`, alinhado com a definição oficial em `mem://logic/indicators/incremento-definition-v4`.

## Detalhes técnicos

- Arquivo: `src/hooks/useConsolidatedMetas.ts`
- O hook já carrega `funnelData` (usado em `getPlanGrowthMeta`); reutilizar essa fonte para evitar nova query.
- Não mudar nada para O2 TAX, Oxy Hacker e Franquia (continuam usando `monetary_metas.faturamento` como hoje, conforme definição da memória).
- Não alterar schema do banco nem rótulos da UI.

## Validação

Após a mudança, na aba Indicadores, BU Modelo Atual:
- Mai: Fat Incremento deve mostrar **R$ 400.000** (= valor "A Vender" do Plan Growth).
- Jun+: deve mostrar `funnel_metas.faturamento_vender` correspondente (hoje 0 no banco, então cairá no fallback até o Plan Growth gerar valores).
- Jan-Abr: continuam inalterados (já corretos via snapshot).

## Fora de escopo

- Renomear coluna `monetary_metas.faturamento` ou ajustar como ela é populada.
- Mudar comportamento das outras BUs.
- Mexer no Plan Growth ou nas metas de funil.
