# Corrigir Ciclo de Venda (Comercial)

## Problema

No drill-down "O Que Fechamos e Como?" (indicador **Venda** da aba Comercial), a coluna **Ciclo** e o KPI **Ciclo Médio** mostram o valor errado.

Exemplo — card 1273063742 (Twist Plásticos, CaaS, assinado 28/02/2026): tela mostra **9d**, mas o card existe há muito mais tempo. O 9d é apenas o tempo na última fase ("Contrato em elaboração" → "Contrato assinado"), não o ciclo comercial completo.

### Causa raiz

Em `IndicatorsTab.tsx:1992`:
```ts
const cicloVenda = item.duration ? Math.floor(item.duration / 86400) : 0;
```
`item.duration` vem de `card.duracao`, que nas hooks (`useModeloAtualAnalytics`, `useO2TaxAnalytics`, `useExpansaoAnalytics`) é `dataSaida − dataEntrada` da fase atual — ou seja, **tempo na última fase**, não Lead → Fechamento.

## Definição correta

**Ciclo Comercial = Data de Assinatura do Contrato − Data de Criação do Card** (em dias).

Ou seja: desde o exato momento em que o lead entrou no CRM até a assinatura. Ambos os campos já existem nas hooks (`card.dataCriacao` + `card.dataAssinatura`), só não são expostos no `DetailItem`.

## Mudanças

1. **`src/components/planning/indicators/DetailSheet.tsx`** — adicionar `dataCriacao?: string` na interface `DetailItem` (após `dataAssinatura`).

2. **`src/hooks/useModeloAtualAnalytics.ts`** (toDetailItem, ~linha 474) — adicionar:
   ```ts
   dataCriacao: card.dataCriacao?.toISOString() ?? undefined,
   ```

3. **`src/hooks/useO2TaxAnalytics.ts`** (toDetailItem, ~linha 632) — mesma adição.

4. **`src/hooks/useExpansaoAnalytics.ts`** (toDetailItem, ~linha 423) — mesma adição.

5. **`src/components/planning/IndicatorsTab.tsx`** (case `'venda'`, linhas 1990-2001) — trocar o cálculo:
   ```ts
   const cicloVenda = (() => {
     if (!item.dataAssinatura || !item.dataCriacao) return 0;
     const ms = new Date(item.dataAssinatura).getTime() - new Date(item.dataCriacao).getTime();
     return ms > 0 ? Math.floor(ms / 86_400_000) : 0;
   })();
   ```
   Manter o filtro `> 0` no cálculo do **Ciclo Médio** para excluir cards sem datas válidas.

## Escopo

- Vale para **todas as BUs** (Modelo Atual, O2 TAX, Expansão) — todas passam pelo mesmo case `'venda'`.
- Só afeta o drill-down de Venda; nenhum outro indicador usa `cicloVenda`.
- Puramente cálculo de UI — nada muda no banco.

## Verificação

Após o ajuste, abrir Venda de fev/26 e conferir o Twist Plásticos: ciclo deve refletir os dias entre a criação do card e 28/02/2026 (semanas/meses, não 9d).
