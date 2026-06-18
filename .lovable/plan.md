# Aba Pessoas — alinhar ao plano oficial (até Bloco B)

Escopo 100% pessoas. Sem CLT×PJ (todos são PJ). Sem cruzamento comercial.

## Status vs. plano

**Fase 1 (9 indicadores) já está toda na tela:** headcount atual / por área / por time, tempo médio de casa, turnover geral, turnover por área, custo de pessoal total, custo/receita, custo per capita, custo de turnover. Não mexo nessa parte.

## O que entra agora

### Bloco A — Distribuição etária (dado novo já disponível)

`pipefy_db_pessoas.Data de nascimento` está populado mas não usado. Adicionar 1 card:

- **Idade média** e **mediana** (KPIs no topo do card).
- Histograma por faixa: `<25`, `25–30`, `30–35`, `35–40`, `40–50`, `>50`.
- Quebra por BU (Time→BU) em barras empilhadas pequenas embaixo.
- Tooltip: contagem + % do total. Click em barra → `PeopleDrillSheet` com a lista.

Arquivos:
- `useHrData.ts` — expor `dataNascimento` em `PessoaRow`; helper `idade`.
- `pessoas/helpers.ts` — `ageBucket(idade)`, `ageDistribution(rows)`, `ageByBu(rows)`.
- `pessoas/AgeDistribution.tsx` (novo).

### Bloco B — Painel "Fase 2 — Roadmap de indicadores"

Card de roadmap visível na própria aba, espelhando exatamente a tabela da seção 4 do documento. Para cada linha: nome, blocker, responsável, status (🟡 Falta dado / 🟠 Em definição), e — quando o dado parcial existe — um valor preliminar.

Linhas e o que dá pra entregar **parcialmente já hoje**:

| Indicador Fase 2 | Entrega agora | Falta para versão final |
|---|---|---|
| Turnover voluntário × involuntário | Total de desligados no período (sem split) | Campo "motivo de desligamento" no Pipefy |
| Custo de pessoal por área | — | Centro de custo por área no Conta Azul |
| Headcount vs. orçado | Headcount atual (sem orçado) | Plano de headcount formalizado |
| Folha vs. orçado | Custo de pessoal atual (sem orçado) | Orçamento de folha |
| % OKRs definidos / atingidos | — | Fonte dos OKRs |
| eNPS / clima | — | Ferramenta de pesquisa |
| % 1:1 realizados | — | Registro padronizado |
| PDI / treinamento / promoções | — | Pipe de desenvolvimento |
| Time to hire / custo por contratação | — | Pipe de recrutamento |
| Absenteísmo | — | Fonte de frequência |

Implementação: componente de tabela `FaseDoisRoadmap.tsx` com array estático tipado (`indicador`, `blocker`, `responsavel`, `status`, `valorParcial?`). Linhas com `valorParcial` mostram o número + badge "parcial"; linhas sem mostram "—" + badge "falta dado". Sem cor agressiva; usa os mesmos tokens das outras tabelas da aba.

Bônus dentro do Bloco B (zero custo de dado):
- **Subcard "Saneamento de dados"** com 2 alertas que destravam a Fase 2:
  - "N pessoa(s) sem `Data de contratação`" (impede turnover/tempo de casa).
  - "N Inativa(s) sem `Data de desligamento` (proxy `updated_at` em uso)" — primeiro passo para destravar turnover voluntário × involuntário.

Arquivos:
- `pessoas/FaseDoisRoadmap.tsx` (novo).
- `pessoas/SaneamentoCard.tsx` (novo) — usa `useHrData` direto.

### Integração

- `PessoasTab.tsx` — inserir Bloco A após o card de tempo médio de casa; inserir Bloco B (Roadmap + Saneamento) como última seção da aba, antes do rodapé.

## Fora de escopo
- CLT vs PJ (todos PJ — confirmado).
- Qualquer indicador comercial (SDR, Closer, CFO, NPS, jornada, marketing).
- Salário individual, banda salarial, manager, gênero, raça — sem dado.

## Memória
- `mem://logic/pessoas/all-pj` — "Todos os colaboradores da O2 são PJ. Não diferenciar CLT/PJ na aba Pessoas."
- `mem://features/pessoas/fase-2-roadmap` — referência ao documento oficial e à lista dos 9 indicadores pendentes com seus blockers.
