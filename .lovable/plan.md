## Descoberta

A Oxy DRE **já entrega custo de pessoal por BU de forma nativa**, via nomes de categoria com sufixo da BU. Exemplo Mar/2026:

**Dentro de Custos Variáveis → Custos CaaS:**
- Equipe CaaS — R$ 203.644
- Benefícios - CaaS — R$ 6.190
- Remuneração de Estagiários - CaaS — R$ 3.500
- Alimentação CaaS — R$ 7.695
- Deslocamento CaaS — R$ 9.310
- Viagens e Estadias CaaS — R$ 587

**Dentro de Despesas Fixas → Despesas com Pessoal (corporativo, não-BU):**
- Pró-labore sócios — R$ 41.500
- Serviços de Terceiros — R$ 20.500
- Benefícios — R$ 4.900
- Salários / FGTS / INSS / Férias / 13º / Rescisões / Seguro de Vida — R$ 0 nesse mês
- Estagiários — R$ 120

**Conclusão:** não inventamos % nenhum. O custo de pessoal por BU sai direto da API, e o "Corporativo" entra como linha separada.

## O que vamos construir (e descartar)

### Descartar
- `personnel_dre_mapping` com `team_split` JSONB (rateio manual virou desnecessário).
- Botões "Sugerir por headcount" / "Distribuir pendentes".
- O `DreMappingPanel` inteiro na forma atual.

Migration nova: drop da coluna `team_split` e da tabela (ou marcar deprecated). Confirmar com você se prefere drop ou manter desabilitada.

### Construir

**Novo hook** `src/hooks/usePersonnelCostByBu.ts`:
- Busca em paralelo `dre_categories` para os 6 grupos de Custos Variáveis (Custos CaaS, SaaS, TAX, Expansão, CS, Education) + grupo "Despesas com Pessoal".
- Classifica cada categoria como "pessoal" via regex de keywords: `Equipe|Benefícios|Estagiário|Alimentação|Deslocamento|Viagens|Pró-labore|Salário|FGTS|INSS|Rescis|Férias|13º|Cursos|Treinamento|Seguro de Vida|Distribuição de Lucros|Terceiros`.
- Extrai a BU do nome da categoria (sufixo " CaaS", " - SaaS", "Tax", "Expansão", "CS"). Sem sufixo + vier de "Despesas com Pessoal" → bucket "Corporativo".
- Retorna:
  ```
  porBu: [{ bu: 'CaaS', total, categorias: [{label, valor}] }, ...]
  corporativo: { total, categorias: [...] }
  total: number
  ```

**Reformular `PessoasTab.tsx`** — 3 cards substituindo a UI atual de rateio:

1. **Custo de pessoal por BU** — barra horizontal: CaaS / SaaS / TAX / Expansão / CS / Corporativo. Click expande drawer com lista de categorias reais da Oxy (ex: Equipe CaaS R$ 203k, Benefícios CaaS R$ 6k…).
2. **Custo médio por pessoa por BU** — tabela: BU | Headcount (Pipefy, filtrado por `Time` mapeado pra BU) | Custo total | Custo/pessoa. "Corporativo" mostra headcount de Times corporativos (RH, Fin, C-level) com headcount Pipefy correspondente. Banner explicando origem dos números.
3. **Composição corporativa** — donut do que está em "Despesas com Pessoal" (Pró-labore, Terceiros, Benefícios, etc.) — para entender o que sobra fora das BUs.

**Mapeamento Time(Pipefy) → BU** (só para o "custo por pessoa"):
- Pequeno painel admin novo em `PessoasTab` (ou settings): tabela `team_to_bu_mapping` (team TEXT PK, bu TEXT). Vem zerada; usuário marca "Time X → CaaS". É só para dividir headcount entre BUs (não afeta o custo, que já vem por BU da Oxy).

**Cleanup:**
- Remover `usePersonnelCostFromDRE.ts` (substituído por `usePersonnelCostByBu.ts`).
- Remover `DreMappingPanel.tsx` ou esvaziar.
- Migration: drop `personnel_dre_mapping` e `personnel_dre_groups_config` (ou manter como histórico — você decide).

### Edge function
`fetch-oxy-finance` action `dre_categories` já existe e aceita `groupIds[]`. Vou chamar uma vez por mês com todos os groupIds de Custos Variáveis + Pessoal. Sem nova edge function.

### Dúvidas pra confirmar antes de codar
1. **Dropar `personnel_dre_mapping` e `personnel_dre_groups_config`** ou só parar de usar?
2. **Mapeamento Time→BU**: criar painel admin agora ou começar sem custo/pessoa (só custo total por BU) e adicionar depois?
3. **Education**: incluir como BU separada no card, ou agrupar com Corporativo (já que é zero)?
