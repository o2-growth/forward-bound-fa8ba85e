## Objetivo

Hoje só alguns pontos da Visão do CEO (Indicadores → CEO) são clicáveis. O `CeoMetricDialog` (Sheet lateral) já existe pronto, mas **não está sendo usado em lugar nenhum**. A ideia é ligá-lo em **todos** os cards de métrica das 5 seções (Comercial, Pessoal, Financeiro, DRE, Caixa), abrindo um painel de detalhe com o breakdown por trás do número.

## Escopo

**5 arquivos de seção** — todos os `<MetricCard>` ganham `onClick` que dispara o `CeoMetricDialog` com um payload consistente:

1. `ComercialSection.tsx` (8 cards)
   - **Pipe de Vendas** (Pipe total, Quente, Morno, Frio) → breakdown por closer + canal + BU + produto (dados já calculados em `pipe.by*`)
   - **Pace** (Realizado, Meta período, Atingimento, vs Pace) → breakdown de realizado por BU (Modelo Atual, O2 TAX, Franquia, Oxy Hacker) + notas do cálculo do pace

2. `PessoalSection.tsx` (4 cards)
   - **Receita/pessoa**, **MRR/pessoa**, **Headcount**, **Receita período** → breakdown por setor (`setores.porSetor` já existe) com pessoas e receita por setor

3. `FinanceiroSection.tsx` (5 cards)
   - **Clientes ativos**, **Churn**, **Base clientes** → breakdown por BU/plano usando `kpis`
   - **Inadimplência** (Total, Clientes, Top) → tabela de clientes inadimplentes (dados de `receivables`)

4. `DreSection.tsx` (todos os cards principais)
   - Cada linha do DRE clicada abre breakdown por categoria/BU (dados já vêm de `useOxyFinance`/`useDreDrillDown`)

5. `CaixaSection.tsx` (6 cards)
   - **Entradas/Saídas/Saldo** → tabela mensal (`data.serieMensal`)
   - **Total saídas / Itens / Top 1** → tabela ordenada de despesas (`expenses.items`)

## Como funciona (padrão único)

Em cada seção:

```ts
const [drill, setDrill] = useState<CeoMetricDialogPayload | null>(null);
// ...
<MetricCard 
  label="Pipe total" 
  value={fmt(pipe.total)} 
  onClick={() => setDrill({
    title: "Pipe total em negociação",
    value: fmt(pipe.total),
    subtitle: periodLabel,
    breakdown: { title: "Por temperatura", rows: [...] },
    table:     { title: "Por closer", columns: [...], rows: pipe.byCloser },
    notes: ["Fonte: Pipefy — deals abertos por BU..."],
  })}
  source={SRC_PIPE}
/>
// ...
<CeoMetricDialog payload={drill} open={!!drill} onOpenChange={(o)=>!o && setDrill(null)} />
```

- Nenhum dado novo precisa ser buscado — todos os breakdowns já estão calculados nos `useMemo` das seções.
- O `MetricInfo` (ícone “i” no canto) continua funcionando (já tem `stopPropagation`).
- Cards `placeholder` continuam não-clicáveis (já bloqueado no `MetricCard`).

## Fora de escopo

- Nenhuma mudança em hooks, dados, cálculos ou schema.
- Nenhuma mudança visual nos cards além do cursor `pointer` que o próprio `MetricCard` já aplica quando `onClick` está setado.
- IA / notas explicativas ficam iguais.

## Validação

Após implementação: abrir Indicadores → CEO → percorrer as 5 abas e clicar em cada card, confirmando que o Sheet abre com breakdown coerente e que o clique no “i” continua abrindo o popover de fonte sem abrir o Sheet.
