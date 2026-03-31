

## Correção: Filtro de SDR não funciona para Oxy Hacker e Franquia

### Problema
Na seção de **acelerômetros (gauges)** da aba Indicadores, o filtro de SDR para Oxy Hacker e Franquia usa `card.responsible` em vez de `card.sdr || card.responsible`. O campo `responsible` nas cards de Expansão contém o **Closer** (não o SDR), porque é preenchido como `Closer responsável || SDR responsável`. Isso faz com que a filtragem por SDR não encontre correspondência.

### Causa raiz
Nas linhas ~827-858 (O2 Tax, Oxy Hacker, Franquia — seção de gauges), o código faz:
```
matchesSdrFilter(card.responsible)  // ← usa o Closer, não o SDR
```
Enquanto em outras seções (drill-down, chart data), o código já usa corretamente:
```
matchesSdrFilter(item.sdr || item.responsible)  // ← correto
```

### Solução
Alterar as 3 ocorrências na seção de cálculo dos gauges (~linhas 829, 857, 885) para usar `card.sdr || card.responsible` em vez de apenas `card.responsible`:

**Arquivo**: `src/components/planning/IndicatorsTab.tsx`

1. **Linha ~829** (O2 Tax gauge): `matchesSdrFilter(card.sdr || card.responsible)`
2. **Linha ~857** (Oxy Hacker gauge): `matchesSdrFilter(card.sdr || card.responsible)`
3. **Linha ~885** (Franquia gauge): `matchesSdrFilter(card.sdr || card.responsible)`

São 3 substituições simples no mesmo arquivo — sem impacto em outras funcionalidades.

