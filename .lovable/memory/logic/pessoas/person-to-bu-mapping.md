---
name: Mapeamento Pessoa → BU (Hipótese A)
description: Como classificar cada pessoa do pipefy_db_pessoas em CaaS, SaaS, TAX, Expansão ou Corporativo a partir de Time + Cargo
type: logic
---

`pipefy_db_pessoas` não tem campo de BU. A função `personToBu(time, cargo)` em `src/components/planning/pessoas/helpers.ts` aplica a Hipótese A:

| Time (Pipefy) | Cargo | BU |
|---|---|---|
| Operação | qualquer (CFOaaS, FP&A, CS, BPO, Projetos, Coordenador) | **CaaS** |
| Tecnologia | qualquer | **SaaS** |
| TAX | qualquer | **TAX** |
| Comercial | qualquer (default) | **CaaS** |
| Comercial / Growth / qualquer | Cargo contém "expansão" | **Expansão** (refinamento por Cargo tem prioridade) |
| Growth | resto (Captação, Comunicação) | **Corporativo** |
| Marketing | qualquer | **Corporativo** |
| Diretoria | CEO/CMO/COO | **Corporativo** |
| qualquer outro | qualquer | **Corporativo** |

Refinamento por Cargo `/expansao/` é checado ANTES da regra por Time — Head Expansão (Time=Growth) cai em Expansão.

Helpers derivados:
- `headcountByBu(rows)` — contagem ativos por BU
- `turnoverByBu(rows, from, to)` — desligados/headcount por BU
- `pessoasOfBu(rows, bu)` — lista para drill
- `allActiveWithBu(rows)` — todos ativos com `.bu` resolvida
- `admissoesIn(rows, from, to)`, `desligadosIn(rows, from, to)` — listas com BU resolvida

A função antiga `timeToBu(time)` em `PessoasTab.tsx` agora é um wrapper sobre `personToBu(time, "")` — mantida só para compat com call-sites que só têm Time.

Não inventar rateio proporcional (ex.: "30% do Comercial vira SaaS"). Pessoa fica inteira numa única BU.
