## Objetivo

Somar ao MRR Total do squad **Pedrolo** (CfoView) o faturamento dos produtos **OXY**, **OXY + Gênio** e **OXY + Gênio + Especialista**, lidos como subcategorias do grupo **SaaS** no DRE da Oxy Finance.

## Comportamento esperado

- A linha "Eduardo Milani Pedrolo" passa a exibir `mrrTotal = (Setup + valorOxy de cada cliente do mês passado) + (OXY + OXY+Gênio + OXY+Gênio+Especialista do DRE)`.
- Margem, Ticket Médio, Health Score e demais cálculos derivados refletem automaticamente o novo `mrrTotal` (já que vêm dele).
- Nenhuma outra carteira de CFO é afetada.
- Mantém o mesmo recorte temporal já usado para Pedrolo: **mês calendário anterior** ao atual.

## Mudanças técnicas

### 1. `src/hooks/useOxyFinance.ts`
- Localizar o `id` do grupo "SaaS" dentro de `dreData.groups` (varredura por `label` normalizado).
- Adicionar nova `useQuery` que chama `fetch-oxy-finance` com `action: 'dre_categories'` e `groupIds: [saasGroupId]`, dependente do DRE principal (enabled só após resolver o id).
- Parsear o retorno de categorias e somar, por mês, apenas as labels normalizadas:
  - `oxy`
  - `oxy + genio` / `oxy + gênio`
  - `oxy + genio + especialista` / `oxy + gênio + especialista`
  Normalização: `trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')`.
- Expor novo campo no resultado do hook: `oxyProductsByMonth: Record<MonthType, number>` (total dos 3 produtos por mês).

### 2. `src/hooks/useJornadaData.ts`
- Importar `useOxyFinance` (ou aceitar `oxyProductsByMonth` como parâmetro vindo do consumidor).
- Identificar o mês alvo: o **mês anterior** já calculado em `mesAnteriorStart` → mapear para `MonthType` (Jan…Dez).
- Após montar `cfoMap`, adicionar o valor `oxyProductsByMonth[mesAnteriorMonth]` ao `mrrTotal` da entrada cujo nome contém "Pedrolo". Se Pedrolo não estiver no mapa (sem clientes), criar a entrada apenas se o valor > 0.
- Não alterar `mrrEmRisco`, contagem de clientes, NPS ou Health.

### 3. `src/components/planning/jornada/CfoView.tsx`
- Atualizar tooltip da linha Pedrolo (ou texto "Receita = MRR…") para deixar explícito: "Pedrolo: Setup + Oxy por cliente (mês passado) + OXY/Gênio/Especialista do DRE".
- Nenhum cálculo direto aqui — `mrrTotal` já chega pronto do hook.

## Pontos a validar na implementação

- O endpoint `dre-table-categories` retorna o mesmo formato `groups[].data[].period/value` esperado pelo parser; se não, ajustar parser.
- Se o grupo SaaS não for encontrado pelo label, logar warning e devolver zeros (fallback seguro).
- Cache de 10 min (igual demais queries Oxy) para não estourar quota.

## Memória a atualizar após implementação

Atualizar `mem://logic/operations/mrr-total-definition` para refletir que **MRR Pedrolo = Setup + Oxy (Pipefy, mês passado) + OXY/Gênio/Especialista (DRE Oxy Finance, mês passado)**, mantendo os demais CFOs como CFOaaS + OXY de Pipefy.