# Diagnóstico

Print confirma 5 vendas em Maio com Closer preenchido. O problema **não é dado**, é o **matcher do filtro de Closer**, que falha em nomes com tokens extras.

## Causa principal

`matchesCloserFilter` (`IndicatorsTab.tsx:650`) usa apenas `includes` bidirecional após `toLowerCase().trim()`:

```ts
normalizedSelected.includes(normalizedCloser) || normalizedCloser.includes(normalizedSelected)
```

Falha clássica:

- Filtro `Amanda Serafim` × Card `Amanda Teixeira Serafim` → `"amanda teixeira serafim".includes("amanda serafim")` = **false** → Amanda zera tudo.
- Pequenas variações invisíveis (espaço duplo, quebra, acento) também derrubam o match.

# Plano de correção

## 1. Novo matcher tolerante (tokens)

Substituir `matchesCloserFilter` por uma função que:

- aplica `normalize('NFD')` removendo diacríticos;
- remove pontuação;
- colapsa qualquer espaço/quebra em um único espaço;
- compara por **tokens**: o card faz match se contém **todos os tokens** do filtro (em qualquer ordem, qualquer posição).

Resultado garantido:

```text
Filtro "Amanda Serafim"  → tokens [amanda, serafim]
Card   "Amanda Teixeira Serafim" → match true
Card   "Daniel  Trindade" / "Daniel\nTrindade" → match com filtro "Daniel Trindade"
```

Mesma normalização também é aplicada ao matcher de SDR.

## 2. Indicadores que respeitam o filtro de Closer

Ativar o filtro de Closer em **todos** os pontos onde Closer atua, com a nova função:

- **Acelerômetros de quantidade**: Reunião Marcada (RM), Reunião Realizada (RR), Propostas, Vendas
- **Acelerômetros monetários**: **Fat Incremento, MRR, Setup, Pontual**
- **Tabela de detalhe** e **drill-downs** (lista de cards)
- **Pace chart** de Setup/Pontual

Para o topo de funil onde Closer ainda não existe (MQL, Leads, SLA): manter o número da BU/SDR mesmo com Closer ligado, em vez de zerar.

## 3. Pontos de código a alterar

Em `src/components/planning/IndicatorsTab.tsx`:

- `matchesCloserFilter` e `matchesSdrFilter` (linhas 650 e 666) — substituir por matcher por tokens.
- `getRealizedForIndicator` blocos por BU (linhas 898–987).
- `getMetaForIndicator` blocos por BU (linhas 1245–1435).
- `getRealizedMonetaryForIndicator` (linhas 2084+) — Fat Inc, MRR, Setup, Pontual já passam por `filteredVendasForBU`; só precisam herdar o novo matcher.
- Pace chart `getSetupPontualCardsForBU` (~2820).
- Drill-downs / tabelas que recebem `selectedClosers`.

## 4. Validação no preview (Maio/2026 + Modelo Atual)

Sem filtro: 5 vendas (baseline já no console).

| Closer | Vendas esperadas | MRR | Setup | Pontual |
| --- | --- | --- | --- | --- |
| Daniel Trindade | 1 (Produtos Dalen) | 3.500 | 0 | 0 |
| Amanda Serafim | 2 (Portal refeições + Expresso 424) | 3.244 | 21.800 | 0 |
| Pedro Albite | 1 (Fusão Impressão Digital) | 11.570 | 25.000 | 0 |
| Thiago | 1 (Grupo SM Auto Peças) | 0 | 15.564 | 0 |
| Bruna | 0 | 0 | 0 | 0 |

Para cada caso:
- RM/RR refletem o número do Closer.
- MQL/Lead **não** zeram.
- SDR + Closer combinados continuam aplicando ambos.

# Arquivo afetado

- `src/components/planning/IndicatorsTab.tsx`

Sem mudanças em banco, edge functions ou autenticação.