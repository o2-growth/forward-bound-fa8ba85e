## Alterar meta de margem CFO de 65% para 54%

**Arquivo:** `src/components/planning/jornada/CfoView.tsx` (linha 126)

**Mudança:**
```diff
- margemTarget: 65,
+ margemTarget: 54,
```

Essa constante (`TARGETS.margemTarget`) é usada no card de margem da view CFO (aba Operação → CFO) como referência da meta exibida ("Meta: X%") e como threshold para colorir/avaliar a margem realizada.

Sem outros efeitos colaterais — é o único ponto que define essa meta.