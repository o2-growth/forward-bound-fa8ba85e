

## Ajuste MQL Expansão: investimento disponível ≥ R$ 15k (separado por BU)

O critério MQL para **ambas** as BUs de Expansão (Franquia e Oxy Hacker) passa a ser: lead com campo "Investimento disponível" preenchido e ≥ R$ 15k. Como todas as faixas existentes no Pipefy ("Menos de 54 mil reais" em diante) representam valores acima de R$ 15k, **qualquer faixa preenchida já qualifica**. A lógica continua separada por BU (cada hook trata seu produto).

### Alterações

| Arquivo | O que muda |
|---------|-----------|
| `src/hooks/useOxyHackerMetas.ts` | Atualizar comentário para "≥ R$ 15k". Simplificar `isOxyHackerMqlQualified`: retorna `true` se investimento preenchido (qualquer faixa ≥ 15k). |
| `src/hooks/useExpansaoMetas.ts` | Atualizar comentário Franquia para "≥ R$ 15k" (era ≥ 140k). Simplificar `isFranquiaMqlQualified`: retorna `true` se investimento preenchido. |
| `src/hooks/useExpansaoAnalytics.ts` | Unificar threshold nos comentários para "≥ R$ 15k". Simplificar `isExpansaoMqlQualified`: `return !!investimento` (ambos os produtos usam o mesmo critério agora). Manter a separação por `produto` no filtro de dados. |

### Lógica resultante (nos 3 arquivos)

```typescript
// MQL Expansão: investimento disponível >= R$ 15k
// Todas as faixas do Pipefy já são >= 15k, então qualquer investimento preenchido qualifica
function isMqlQualified(investimento: string | null): boolean {
  return !!investimento && investimento.trim().length > 0;
}
```

A separação por BU continua existindo nos hooks — cada um filtra por `produto === 'Franquia'` ou `produto === 'Oxy Hacker'` respectivamente. Apenas o critério de qualificação MQL (faixa de investimento) é unificado.

