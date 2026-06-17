# Plano: Detecção de grupos DRE de Pessoal + visibilidade do painel

## Diagnóstico
- `personnel_dre_mapping` tem 0 linhas → cards "Custo por Pessoa/Time" estão corretamente vazios.
- Usuário não viu o painel de Mapeamento → provavelmente `gruposPessoal = []` porque o regex (`despesas com pessoal`, `pessoal`, `rh`, `folha de pagamento`) não casa com os labels reais da DRE Oxy desse projeto. Sem grupo detectado, `categorias = []` e a aba Pendentes renderiza "Tudo mapeado".

## Mudanças

### 1. Sempre renderizar o painel, mesmo sem grupos
Em `PessoasTab.tsx`, garantir que `DreMappingPanel` apareça mesmo com 0 categorias e mostre um estado vazio explicativo (em vez de "Tudo mapeado!" que confunde).

### 2. Seletor manual de grupos DRE
Adicionar um bloco "Grupos DRE considerados como Pessoal" no topo do 3.2 com:
- Lista de **todos** os grupos da DRE (de `oxy.dreRaw.groups`) com checkbox.
- Pré-marca os que casam com o regex atual.
- Seleção é persistida em uma nova tabela `personnel_dre_groups_config` (key `groups` = array de group ids) — vale pra todos os usuários.
- O hook `usePersonnelCostFromDRE` passa a usar a seleção persistida (com fallback pro regex se a config estiver vazia).

### 3. Banner de diagnóstico
Quando `gruposPessoal.length === 0`, mostrar card amarelo no topo do 3.2:
> "Nenhum grupo de Pessoal foi detectado automaticamente na DRE. Selecione manualmente abaixo quais grupos representam custo de pessoal."

Com botão "Selecionar grupos" que abre o seletor.

### 4. Mostrar categorias detectadas mesmo sem mapping
No `DreMappingPanel`, melhorar o estado vazio da aba Pendentes:
- Se `categorias.length === 0` E `gruposPessoal.length === 0`: "Configure os grupos DRE de Pessoal acima."
- Se `categorias.length === 0` E `gruposPessoal.length > 0`: "Sem lançamentos no período selecionado."
- Se há categorias e tudo já mapeado: "Tudo mapeado 🎉"

## Arquivos
- `supabase/migrations/*` — nova tabela `personnel_dre_groups_config` (singleton key/value JSONB)
- `src/hooks/usePersonnelDreGroupsConfig.ts` (novo) — load/save da config
- `src/hooks/usePersonnelCostFromDRE.ts` (editar) — usar config persistida com fallback regex
- `src/components/planning/DreGroupsSelector.tsx` (novo) — UI do seletor com checkboxes
- `src/components/planning/PessoasTab.tsx` (editar) — banner + seletor + sempre renderizar painel
- `src/components/planning/DreMappingPanel.tsx` (editar) — mensagens vazias contextuais

## Fora de escopo
- Mudar o regex de auto-detect (continua como fallback inicial).
- Histórico de quem mudou a config.
