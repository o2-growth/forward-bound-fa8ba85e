

## Adicionar painel de "Critérios de Filtro" nos drill-downs dos acelerômetros (MQL, RM, RR)

### O que muda
Quando o usuário clicar no acelerômetro de MQL, Reunião Agendada ou Reunião Realizada, o modal de detalhes exibirá um bloco informativo no topo (antes dos KPIs) explicando **em linguagem simples** quais critérios foram usados para gerar aquele número.

### Exemplo visual
Ao clicar no acelerômetro de MQL, aparecerá algo como:

```text
┌─────────────────────────────────────────────────────────────┐
│ ℹ️  Como este número é calculado                            │
│                                                             │
│ Fonte de dados: Cards do Pipefy (pipe de cada BU)           │
│                                                             │
│ ▸ Modelo Atual:                                             │
│   • Faturamento ≥ R$ 200k (faixas: R$200-350k, R$350-500k, │
│     R$500k-1M, R$1-5M, >R$5M)                              │
│   • Data de criação do card dentro do período selecionado   │
│   • Exclui cards de teste                                   │
│   • Exclui cards com motivo de perda: Duplicado, Pessoa     │
│     física/fora do ICP, Não é demanda real, etc.            │
│                                                             │
│ ▸ O2 TAX:                                                   │
│   • Faturamento ≥ R$ 500k                                   │
│   • Mesma lógica de exclusão por motivo de perda             │
│                                                             │
│ ▸ Oxy Hacker / Franquia:                                    │
│   • MQL = todos os Leads (incluindo "Start form")           │
│   • Funil cumulativo: cards em fases avançadas sem           │
│     histórico em Leads também contam                         │
│                                                             │
│ Filtros ativos: BU Modelo Atual, Período Jan-Mar 2026       │
└─────────────────────────────────────────────────────────────┘
```

### Alterações

**1. `src/components/planning/indicators/DetailSheet.tsx`**
- Adicionar nova prop opcional `filterCriteria?: string[]` — array de linhas de texto explicativo
- Renderizar um bloco colapsável `<Collapsible>` com ícone ℹ️ e título "Como este número é calculado" logo acima dos KPIs/tabela
- Estilo: fundo `bg-blue-50 dark:bg-blue-950`, borda `border-blue-200`, texto `text-sm`
- Cada linha do array será um bullet point com formatação simples

**2. `src/components/planning/IndicatorsTab.tsx`** — No `handleRadialCardClick`:

Para cada indicador, montar o array `filterCriteria` com textos descritivos:

**MQL** — critérios por BU incluída:
- Modelo Atual: "Faturamento da empresa ≥ R$ 200 mil", "Data de criação do lead dentro do período", "Exclui cards de teste", "Exclui leads com motivo de perda: Duplicado, Pessoa física/fora do ICP, Não é demanda real, Buscando parceria, Quer soluções para cliente, Não é MQL mas entrou como MQL, Email/Telefone Inválido"
- O2 TAX: "Faturamento da empresa ≥ R$ 500 mil", mesmas exclusões
- Oxy Hacker: "Todos os leads contam como MQL (incluindo Start form)", "Cards em fases avançadas sem histórico de Lead também são contados"
- Franquia: Idem Oxy Hacker, com faixas de investimento próprias
- Filtros ativos: BUs selecionadas, Closer, SDR, Período

**RM (Reunião Agendada):**
- "Card entrou na fase 'Reunião agendada / Qualificado' dentro do período"
- "Conta a primeira vez que o card aparece nesta fase (evita duplicação)"
- Filtros ativos de Closer/SDR

**RR (Reunião Realizada):**
- "Card entrou na fase 'Reunião Realizada' ou '1ª Reunião Realizada - Apresentação' dentro do período"
- "Conta a primeira vez que o card aparece nesta fase"
- Filtros ativos de Closer/SDR

Também adicionar para **Proposta** e **Venda** com a mesma lógica.

**3. Estado novo em `IndicatorsTab.tsx`:**
- `const [detailSheetFilterCriteria, setDetailSheetFilterCriteria] = useState<string[]>([])`
- Passar para `<DetailSheet filterCriteria={detailSheetFilterCriteria} />`

### Arquivos afetados
| Arquivo | Alteração |
|---------|-----------|
| `src/components/planning/indicators/DetailSheet.tsx` | Nova prop `filterCriteria`, bloco colapsável informativo |
| `src/components/planning/IndicatorsTab.tsx` | Montar e passar `filterCriteria` para cada indicador no `handleRadialCardClick` |

