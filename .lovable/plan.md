## Objetivo
Tornar transparente a regra de cálculo do **Cenário de Caixa** (aba Indicadores Comercial) mostrando, ao lado de cada valor de caixa, qual proporção foi aplicada sobre o total de vendas — com destaque para os 70% do Pontual em Franquia/Oxy Hacker e as regras 0%/75%/50% de Modelo Atual/Outbound.

## Alterações em `src/components/planning/indicators/CenarioCaixaSection.tsx`

### 1. Card de cada cenário (Realista / Otimista)
Logo abaixo do valor total (`formatCurrency(data.total)`), adicionar uma linha discreta `text-xs text-muted-foreground` no formato:

```
≈ 70% do Pontual (Franquia/Oxy Hacker) · 0% MRR + 75% Setup + 50% Pontual (Modelo Atual/Outbound)
```

E ao lado do total, um ícone `Info` com tooltip detalhado mostrando:
- **Bruto considerado** (soma de MRR+Setup+Pontual dos cards do cenário, sem aplicar %)
- **Caixa projetado** (valor atual exibido)
- **% efetiva** = caixa ÷ bruto
- Quebra por BU com a % aplicada

Para isso, `buildCenario` passa a calcular também `grossTotal` (soma dos valores originais antes do `computeCashFromCard`) e `grossByBu`.

### 2. Linha por BU dentro do card
Em cada linha de BU, ao lado do `formatCurrency(info.total)`, adicionar entre parênteses a regra resumida específica daquela BU:
- Franquia / Oxy Hacker → `(70% Pontual)`
- Modelo Atual / Outbound → `(75% Setup + 50% Pontual)`

Renderizado com `text-[10px] text-muted-foreground ml-1`.

### 3. Tooltip do header (já existe)
Refinar o texto para deixar claro que a % é aplicada **sobre o valor de cada card**, não sobre o total de vendas do período, e que MRR é considerado 1× (valor mensal):

```
Cada card é multiplicado pelas % da sua BU:
• Modelo Atual / Outbound: 0% MRR · 75% Setup · 50% Pontual
• Franquia / Oxy Hacker: 70% do Pontual (MRR e Setup ignorados)

Realista = soma de 100% dos cards Quentes
Otimista = soma de 100% dos cards Quentes + Mornos
```

### 4. Drill-down (`DetailSheet`)
Adicionar uma coluna `% aplicada` por linha mostrando a regra usada naquele card (ex.: `70% Pontual` ou `75%S + 50%P`), calculada a partir do `bu` do item. Isso permite ao usuário entender, item a item, por que o valor de caixa é diferente do bruto.

## Detalhes técnicos
- `temperaturaAggregator.ts` já expõe `CASH_RULES` e `computeCashFromCard` — reutilizar sem alterar a lógica de cálculo.
- Nenhuma mudança em hooks/dados — somente camada de apresentação.
- Usar `Tooltip` do shadcn (já importado) e `Info` do lucide-react (já importado).
