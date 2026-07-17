# Fallback de Closer = Bruna (Franquia + Oxy Hacker)

## Objetivo
Todo card das BUs **Expansão Franquia** e **Oxy Hacker** que estiver sem `Closer responsável` preenchido passa a ser tratado como se fosse da **Bruna** em todo o dashboard (filtros, drill-downs, rateios, rankings).

## Escopo
- Aplica-se APENAS a Franquia e Oxy Hacker.
- Modelo Atual e O2 TAX continuam intocados.
- Vale para TODOS os indicadores dessas BUs (MQL, RM, RR, Proposta, Venda) — não só MQL.
- Vale em qualquer período (não é hardcode só de Jul/2026).

## Mudança técnica
Ponto único de enrichment em `src/hooks/useExpansaoAnalytics.ts` (função que resolve `card.closer` a partir dos movimentos do Pipefy, linhas ~498–528):

```
após resolver closer do card:
  if (!card.closer || card.closer.trim() === '') {
    if (bu === 'Franquia' || bu === 'Oxy Hacker') {
      card.closer = 'Bruna';
    }
  }
```

Como todo consumo do filtro Closer em Franquia/Oxy Hacker passa por `card.closer` (via `matchesCloserFilter` em `IndicatorsTab.tsx`), a correção se propaga automaticamente para:
- Cards de qtd por indicador (linhas 946–963 Oxy, 1481–1496 Franquia).
- Drill-down (sheet lateral mostrará "Bruna" na coluna Closer para esses cards).
- Rankings de closer.
- Rateio monetário por closer.

## Efeito esperado (validação)
- Franquia + Oxy Hacker, 01–16/Jul, filtro Closer=Bruna: MQL passa de **7 → 20**.
- Sem filtro: totais permanecem iguais (nenhum card é duplicado, só rotulado).
- Meses futuros com Closer real preenchido no Pipefy: prevalece o valor real; fallback só age quando vazio.

## Ressalvas
- Se no futuro entrar outro closer em Franquia/Oxy Hacker, cards sem preenchimento continuarão indo para Bruna até você pedir mudança. Alternativa (não incluída aqui): usar rateio dinâmico do `closer_metas` do mês. Diga se prefere essa versão.
- Rankings de closer passarão a inflar a Bruna nesses meses — é o comportamento pedido, mas confirme antes de eu implementar.
