# Mapear pessoas → BU + tornar KPIs do topo clicáveis

## Problema 1 — Headcount CaaS/SaaS/Expansão vazio

`pipefy_db_pessoas` não tem campo de BU. Só temos `Time` (7 valores) + `Cargo`. O regex atual (`/caas/`, `/saas/`, `/expansao/`) não bate em nada porque os Times reais são: Operação (30), Comercial (8), Tecnologia (7), Growth (3), Diretoria (3), Marketing (2), TAX (1).

### Hipóteses de mapeamento — escolha 1 (sigo a A se não responder)

**Hipótese A — Híbrida (Time + Cargo, recomendada)**

Aplica regra por Time, refinando com Cargo quando o Cargo é inequívoco:

| Time         | Cargo                                | BU final            |
|--------------|--------------------------------------|---------------------|
| Operação     | qualquer (CFOaaS, FP&A, CS, BPO, Projetos) | **CaaS** (30)  |
| Tecnologia   | qualquer                             | **SaaS** (7)        |
| TAX          | qualquer                             | **TAX** (1)         |
| Comercial    | `Closer` / `Sales Account Executive` | **CaaS** (closer CaaS) ou **Expansão** se cargo contém "Expansão" |
| Comercial    | `BDR/SDR`                            | **CaaS** (default; SDR atende prospect novo, majoritariamente CaaS) |
| Growth       | `Head Expansão`                      | **Expansão**        |
| Growth       | resto (Captação, Comunicação)        | **Corporativo**     |
| Marketing    | qualquer                             | **Corporativo**     |
| Diretoria    | CEO/CMO/COO                          | **Corporativo**     |

Resultado estimado: CaaS≈38, SaaS≈7, TAX≈1, Expansão≈1, Corporativo≈8. (Expansão fica baixo — reflete a realidade do quadro atual; cresce quando contratar mais closer/SDR Expansão.)

**Hipótese B — Só por Time (simples)**

Operação→CaaS, Tecnologia→SaaS, TAX→TAX, Comercial→CaaS, todo o resto→Corporativo. Expansão fica zero porque não há Time "Expansão". CaaS=38, SaaS=7, TAX=1, Expansão=0, Corporativo=8.

**Hipótese C — Rateio por Cargo conhecido (mais agressiva)**

Igual à A, mas divide os 8 do Comercial e os 30 da Operação **proporcionalmente** entre CaaS/SaaS/TAX usando uma chave (ex.: faturamento de cada BU ou peso configurável). Mais "realista" para custo/receita, porém ninguém aparece "inteiro" numa BU — quebra o drill-down de pessoas. Não recomendo.

### Implementação (Hipótese A)

- Substituir `timeToBu(time)` por `personToBu(time, cargo)` em `PessoasTab.tsx` — assinatura passa a receber a pessoa inteira.
- Atualizar todos os call-sites: `timeToBu(h.group)` vira `personToBu(p.Time, p.Cargo)` e os agregados de headcount por BU recalculam direto sobre `rawPessoas` (não sobre `headcountByTime`).
- Adicionar helper `headcountByBu(rows, personToBu)` em `pessoas/helpers.ts`.
- Propagar para `AgeDistribution` (já recebe `timeToBu` — vira `personToBu`), `PeopleDrillSheet` e cards de eficiência por BU (`EfficiencyByBu`).
- Memória: salvar a regra em `mem://logic/pessoas/person-to-bu-mapping`.

## Problema 2 — Drill-down em todos os KPIs do topo

Hoje só os botões de Time/Área no fim da página abrem o `PeopleDrillSheet`. Vou tornar os 8 KPIs solicitados clicáveis:

| KPI                          | Drill abre                                                                 |
|------------------------------|----------------------------------------------------------------------------|
| **Headcount atual**          | Lista completa de ativos, agrupada por BU, com Cargo/Time/Tempo de casa    |
| **Tempo médio de casa**      | Lista ordenada por dias na empresa (asc/desc), com histograma por bucket   |
| **Admissões no período**     | Pessoas com `Data de contratação` dentro do range, ordenadas por data      |
| **Desligados no período**    | Inativos com `updated_at` no range, com Time/Cargo/Última atualização      |
| **Turnover geral %**         | Tabela turnover por Time + lista de desligados que entram no numerador     |
| **Custo total**              | Breakdown por categoria DRE (já existe — vira drawer); link por BU         |
| **Custo / Receita %**        | Mostra numerador (custo por BU) e denominador (receita por BU) lado a lado |
| **Custo per capita**         | Tabela custo/headcount por BU com ranking                                  |

### Implementação

- Estender `usePeopleDrill` para aceitar novos `type`s: `"all-active" | "tenure" | "admissions" | "terminations" | "turnover" | "cost-breakdown" | "cost-revenue" | "cost-per-capita"`.
- Estender `PeopleDrillSheet` para renderizar visual apropriado por tipo (tabela de pessoas para os 5 primeiros; tabela de números para os 3 de custo).
- Trocar `<Card>` por `<button onClick>` no componente `Kpi` (manter visual, só adicionar `cursor-pointer hover:bg-muted/30` quando houver `onClick`).
- Passar handler em cada um dos 8 KPIs do header da aba.

## Fora de escopo
- Drill-down nas barras/cards de composição (perguntei, não foi escolhido).
- Drill nas linhas do roadmap Fase 2.
- Edição manual de BU por pessoa (cria UI/CRUD — fora do pedido).

## Arquivos tocados
- `src/components/planning/PessoasTab.tsx` (mapping + handlers KPIs)
- `src/components/planning/pessoas/PessoasExtras.tsx` (`Kpi` clicável, `PeopleDrillSheet` multi-tipo, `usePeopleDrill` estendido)
- `src/components/planning/pessoas/helpers.ts` (`headcountByBu`, tipos de drill)
- `src/components/planning/pessoas/AgeDistribution.tsx` (assinatura `personToBu`)
- `.lovable/memory/logic/pessoas/person-to-bu-mapping.md` (regra A)
