## Objetivo
Deixar o card **"Receita por BU — mês a mês"** da aba **DRE** da Visão CEO totalmente alinhado com a API Oxy Finance (mesma fonte do DRE completo abaixo), respeitando o filtro de período e cobrindo todas as BUs da empresa.

## O que está hoje
`src/components/planning/ceo/DreSection.tsx` já lê de `useOxyFinance().dreByBU`, mas:
- Mostra apenas 4 linhas fixas (Modelo Atual, O2 Tax, Oxy Hacker, Franquia).
- Não expõe a quebra **CaaS / SaaS** (que Modelo Atual contém dentro).
- Não mostra o consolidado **Expansão** (Oxy Hacker + Franquia agregados como a Oxy trata).
- Header ainda diz "acumulado do ano", mas na verdade já respeita o filtro `from..to`.
- Não tem linha de **Total** por mês nem coluna AV%, dificultando bater com o DRE completo logo abaixo.

## Mudanças

### 1. Rebasear 100% na Oxy
Trocar a montagem das linhas para usar exclusivamente os campos já expostos por `useOxyFinance`:
- `caasByMonth` → linha **CaaS (Modelo Atual)**
- `saasByMonth` → linha **SaaS (Modelo Atual)**
- `dreByBU.o2_tax` → linha **O2 TAX**
- `dreByBU.oxy_hacker` → linha **Oxy Hacker**
- `dreByBU.franquia` → linha **Franquia**
- `expansaoByMonth` → linha **Expansão (Oxy Hacker + Franquia)** como subtotal cinza
- Linha **Total** somando CaaS + SaaS + O2 TAX + Expansão (evita dupla contagem)

### 2. Respeitar o filtro de período
- Continuar usando `MONTHS_PT.slice(fromMonth, toMonth+1)` (já implementado).
- Trocar o subtítulo de "acumulado do ano" para **"período selecionado"**.
- Trocar a descrição para: *"Receita bruta realizada por BU, direto da API Oxy Finance (mesma fonte do DRE completo abaixo)."*

### 3. Coluna AV% + Total
- Adicionar coluna **AV%** por linha (linha / Total do período) para bater visualmente com o P&L logo abaixo.
- Adicionar linha **Total período** em negrito ao final, batendo com a linha "RECEITA BRUTA" do DRE completo — se divergir, exibir um badge de aviso "conferir mapeamento Oxy".

### 4. Consistência com o DRE completo
- Garantir que a soma das linhas por mês bata com `byCode.get("RECEITA BRUTA")[m]` do DRE completo (mesma fonte). Se houver diferença > 0,5%, mostrar um tooltip explicando (linhas Oxy sem classificação de BU ficam agrupadas em "Outros").
- Se houver resíduo (RB Oxy − soma das BUs), incluir linha **"Outros / não classificado"** com o delta, evitando que o usuário ache que "sumiu" receita.

## Arquivo a alterar
- `src/components/planning/ceo/DreSection.tsx` (somente este; a fonte de dados `useOxyFinance` já expõe tudo que precisamos).

## Fora de escopo
- Não mexer em `PessoalSection`, `ComercialSection` ou `CaixaSection`.
- Não alterar `useOxyFinance` (já retorna todos os campos necessários).
