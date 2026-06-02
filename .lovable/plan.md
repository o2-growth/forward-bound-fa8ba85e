## Auditoria UX — Filtro "Origem" (Indicadores Comerciais)

Naveguei até **Indicadores → Comercial → Funil & Metas**, abri o filtro **Todas Origens** e identifiquei 7 problemas de UX, do mais grave ao cosmético:

### Problemas encontrados

1. **Sinalização redundante (ruído visual).** Cada opção mostra **checkbox verde à esquerda + ícone de check verde à direita**. Dois indicadores para o mesmo estado → poluição. Vale para o `MultiSelect` inteiro (afeta também Closers/SDRs).

2. **Capitalização inconsistente.** "Inbound", "Outbound", "Eventos", "Indicação" são Title Case; **"Sem origem"** é sentence case. Em `LEAD_SOURCE_LABELS.sem_origem` (`src/lib/leadSource.ts:50`).

3. **Estado "todas selecionadas" indistinto de "filtro ativo".** O label do trigger fica **"Todas Origens"** tanto quando nada está filtrado (todas marcadas) quanto quando o usuário ainda não escolheu nada. E quando seleciona um subconjunto, não há **bolinha/badge** indicando "filtro ativo" — só a mudança do texto.

4. **Trigger fica verde quando aberto** (estilo do `Button outline` quando o popover está open). Confunde com "filtro aplicado". O destaque visual deveria sinalizar "tem filtro ativo", não "menu aberto".

5. **Sem contagem por origem.** Filtro fica cego: o usuário não sabe quantos MQLs/cards caem em cada bucket no período. Padrão moderno é mostrar `Inbound (124)`, `Outbound (38)`, etc., calculado do dataset atual.

6. **Sem ícones por canal.** Scan visual lento. Sugestão: `Inbound = arrow-down-to-line`, `Outbound = send`, `Eventos = calendar`, `Indicação = users-2`, `Sem origem = help-circle`.

7. **"Sem origem" sem explicação.** Tooltip/hint dizendo "cards sem `Tipo de Origem` nem `Origem do Lead` preenchidos no Pipefy" ajudaria — é a categoria que mais gera dúvida.

8. **Sem botão de clear inline.** Para limpar só o filtro de Origem (sem mexer em Closer/SDR), tem que reabrir o popover e clicar em "Todas Origens". Um `X` no trigger quando há subset ativo resolve.

### Plano de fix

Mudanças **só no componente `MultiSelect`** + `leadSource.ts` + `IndicatorsTab.tsx` (props extras pro filtro de origem), sem mexer em lógica de filtragem nem dados.

**1. `src/components/ui/multi-select.tsx`** (afeta todos os MultiSelects do projeto, melhoria geral)
- Remover o `<Check>` redundante à direita das opções e da linha "todos" (a checkbox já comunica).
- No trigger: quando `selected.length > 0 && !allSelected`, mostrar um **dot indicator** (•) primário ao lado do label e um `X` clicável (chama `onSelectionChange([])` — todas marcadas = sem filtro) — opcional via prop `clearable`.
- Aceitar prop opcional `renderOptionExtra?: (option) => ReactNode` para permitir contagem (`Inbound (124)`) e prop `optionIcon?: (option) => ReactNode` para ícone à esquerda do label.

**2. `src/lib/leadSource.ts`**
- `sem_origem: 'Sem origem'` → `'Sem Origem'` (consistência Title Case).

**3. `src/components/planning/IndicatorsTab.tsx` (linhas 2975-2988)**
- Passar `optionIcon` (mapa origem→`lucide-react` icon) e `renderOptionExtra` calculando contagem do dataset atual já filtrado por BU/data/closer/SDR (sem aplicar o próprio filtro de origem — para não zerar tudo quando o usuário deseleciona).
- Adicionar `clearable` no MultiSelect de Origens.
- Adicionar `title` (tooltip nativo) em "Sem Origem" via opção: `{ value: 'sem_origem', label: 'Sem Origem', hint: 'Cards sem Tipo de Origem nem Origem do Lead preenchidos' }` — extensão da interface `MultiSelectOption`.

### Escopo deixado fora (proposta para depois, se quiser)
- Trocar o pill verde quando o popover está aberto por um estado neutro (mexe no Button variant globalmente — pode afetar outros lugares; melhor decidir em separado).
- Replicar o filtro de Origem na aba **Marketing** se ainda não existir lá com o mesmo padrão.

Arquivos alterados: 3. Sem migração, sem mudança de RLS.
