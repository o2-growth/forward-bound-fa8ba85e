## Objetivo

No dashboard **Pace Comercial** (resumo clicável), as % de conversão "meta" do funil (MQL→RM, RM→RR, RR→Prop, Prop→Venda) devem refletir os valores configurados em **Admin → Indicadores por BU** (`bu_indicators_config`), iguais aos prints enviados para Modelo Atual, Oxy Hacker e Franquia. Hoje essas % são derivadas dividindo metas absolutas de funil (rm/mql, etc.), o que não bate com os percentuais cadastrados.

Escopo restrito ao Pace Comercial — não mexe em IndicatorsTab nem em outras telas.

## Mudanças

**Arquivo:** `src/components/planning/indicators/CommercialPaceDashboard.tsx`

1. Importar `useBUIndicatorsConfig` e a lista `MONTHS` (Jan-Dez).
2. Determinar o **mês de referência** a partir de `startDate` (ex.: `MONTHS[startDate.getMonth()]`).
3. Para cada BU em `selectedBUs` (fallback: todas as 4), buscar `getIndicators(bu, mesRef)` e calcular a **média simples** das taxas `mql_to_rm`, `rm_to_rr`, `rr_to_prop`, `prop_to_venda` entre as BUs com config disponível.
4. Substituir o cálculo atual de `funnelMetaConv` (linhas 211-216) para usar essas taxas (convertendo de % 0-100 → fração 0-1, conforme o formato salvo na tabela). Se nenhuma config existir para o mês, manter o fallback atual (derivado de metas absolutas).
5. Não alterar os números absolutos de meta (`funnelMetas.mql`, `.rm`, etc.) nem o cálculo de `countGoalsFor` — só os percentuais exibidos nos "steps" do funil.

## Validação

- Abrir Pace Comercial com filtro BU = Modelo Atual em Jun → ver 40% / 80% / 80% / 25%.
- Trocar para Oxy Hacker → 40% / 60% / 75% / 15%.
- Franquia → 19% / 79% / 83% / 11%.
- Sem BU selecionada → média das 4 BUs do mês.
