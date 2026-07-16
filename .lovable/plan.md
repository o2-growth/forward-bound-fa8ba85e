# Por que está errado

O que eu fiz na última rodada foi apenas destravar o guard da Bruna com valores nominais de **1** em `closer_absolute_metas` (Jul/2026). Como os cards do dashboard (Reuniões, Propostas, Vendas, Fat Incremento) leem a meta individual **direto dessa tabela**, a Bruna aparece com Meta 1 e Meta R$ 1 — exatamente o que a screenshot mostra.

A tabela `closer_absolute_metas` é **por closer + mês (global, sem BU)**. Não dá pra "somar Franquia + Oxy só pra ela" via BU — tem que gravar o total já consolidado na linha da Bruna.

# Correção

Sobrescrever a linha `closer_absolute_metas` da **Bruna / Jul / 2026** com a soma das metas de Franquia + Oxy Hacker de Julho:

| Campo | Franquia Jul | Oxy Hacker Jul | Total Bruna Jul |
|---|---|---|---|
| rm_meta (Reuniões Agendadas) | 32 | 32 | **64** |
| rr_meta (Reuniões Realizadas) | 27 | 27 | **54** |
| prop_meta (Propostas) | 20 | 20 | **40** |
| venda_meta (Vendas) | 3 | 3 | **6** |
| faturamento_meta | 420.000 | 108.000 | **R$ 528.000** |

Fonte: `funnel_metas` (quantidades) e `monetary_metas.pontual` (financeiro, já que Franquia e Oxy são BUs pontual-only).

Nenhum outro closer/mês é tocado. Rateio `closer_metas` (Bruna 100% em Jul nas 2 BUs) permanece do ajuste anterior.

# Observação sobre MQLs / MRR / Setup

- **MQL Meta: 66** vem de `funnel_metas` agregado, não de `closer_absolute_metas` — não muda com esse ajuste (e a Bruna aparecer com meta de MQL "de todo mundo" é comportamento de outra origem de dados; se quiser, trato separado).
- **MRR/Setup Meta** (R$ 68k / R$ 164k) vêm de `monetary_metas` com rateio de dias úteis e cobrem outras BUs (Modelo Atual/O2 TAX). Franquia e Oxy não têm MRR/Setup — só Pontual. Esses cards vão continuar mostrando 0% de atingido pra Bruna, o que é correto.
