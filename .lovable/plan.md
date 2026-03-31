

## Corrigir explicações de MQL com valores exatos do código

### Problema
As explicações de MQL para Oxy Hacker e Franquia estão genéricas ("com base no investimento disponível informado") — o usuário quer ver os valores exatos usados no filtro.

### Valores reais extraídos do código

**Modelo Atual** — `MQL_QUALIFYING_TIERS` (faturamento mensal):
- Entre R$ 200 mil e R$ 350 mil
- Entre R$ 350 mil e R$ 500 mil
- Entre R$ 500 mil e R$ 1 milhão
- Entre R$ 1 milhão e R$ 5 milhões
- Acima de R$ 5 milhões

**O2 TAX** — `O2_TAX_MQL_QUALIFYING_TIERS` (faturamento mensal):
- Entre R$ 500 mil e R$ 1 milhão
- Entre R$ 1 milhão e R$ 5 milhões
- Acima de R$ 5 milhões

**Oxy Hacker** — `OXY_HACKER_MQL_QUALIFYING_TIERS` (investimento disponível):
- Menos de 54 mil reais
- Menos de 100 mil reais
- Menos de 140 mil reais
- Menos de 250 mil reais
- Menos de 360 mil reais
- Menos de 400 mil reais
- Menos de 500 mil reais
- Mais de 500 mil reais

**Franquia** — `FRANQUIA_MQL_QUALIFYING_TIERS` (investimento disponível):
- Menos de 140 mil reais
- Menos de 250 mil reais
- Menos de 360 mil reais
- Menos de 400 mil reais
- Menos de 500 mil reais
- Mais de 500 mil reais

### Alteração

**Arquivo**: `src/components/planning/IndicatorsTab.tsx` (linhas 1408-1426)

Substituir os textos genéricos por:

**Oxy Hacker:**
```
'MQL = Leads filtrados pelo investimento disponível informado no Pipefy',
'Faixas de investimento aceitas: Menos de R$ 54k, Menos de R$ 100k, Menos de R$ 140k, Menos de R$ 250k, Menos de R$ 360k, Menos de R$ 400k, Menos de R$ 500k, Mais de R$ 500k',
'Ou seja: qualquer lead com investimento informado é considerado MQL',
'Funil cumulativo: cards em fases avançadas sem histórico de Lead também são contados',
'Data de criação do lead dentro do período selecionado',
```

**Franquia:**
```
'MQL = Leads filtrados pelo investimento disponível informado no Pipefy',
'Faixas de investimento aceitas: Menos de R$ 140k, Menos de R$ 250k, Menos de R$ 360k, Menos de R$ 400k, Menos de R$ 500k, Mais de R$ 500k',
'Ou seja: qualquer lead com investimento informado é considerado MQL',
'Funil cumulativo: cards em fases avançadas sem histórico de Lead também são contados',
'Data de criação do lead dentro do período selecionado',
```

### Arquivos afetados
| Arquivo | Alteração |
|---------|-----------|
| `src/components/planning/IndicatorsTab.tsx` | Atualizar textos de Oxy Hacker (linhas ~1408-1416) e Franquia (linhas ~1418-1426) com faixas exatas |

