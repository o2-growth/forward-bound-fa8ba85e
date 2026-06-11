## Diagnóstico

Os acelerômetros (97 MQL / 85 RM / 54 RR / 33 Prop / 0 Venda) usam diretamente `getRealizedForIndicator(...)` sobre todos os itens filtrados.

O funil e a curva do `CommercialPaceDashboard` rodam outra agregação por **closer** e descartam silenciosamente todo item cujo `closer` esteja vazio ou esteja na lista de excluídos (`CommercialPaceDashboard.tsx` linhas 65-70 e 141):

```ts
function personName(item) {
  const name = (item.closer || "").trim();
  if (!name) return "";
  if (EXCLUDED_CLOSERS.has(name.toLowerCase())) return "";
  return name;
}
...
const name = personName(item);
if (!name) continue;   // <- item some do total
```

Como muitos MQLs/RMs ainda não têm closer atribuído, eles somem da agregação → totais do funil ficam abaixo dos acelerômetros (gap brutal em MQL: 97 → 35).

## Correção

Em `src/components/planning/indicators/CommercialPaceDashboard.tsx`:

1. Em vez de `continue` quando `personName` retornar vazio, agrupar o item em um closer sintético `"Sem responsável"` (id estável, ex.: `__none__`). Assim ele entra no total geral mas continua filtrável.
2. Manter o fallback existente do MQL (usar `dataCriacao` e cair no dia 0 se idx<0).
3. Não alterar o ranking de closers de forma indesejada: excluir o bucket `__none__` do `ranking` e do dropdown de seleção (continua aparecendo apenas no total "Todos").

Resultado esperado: com closer = "Todos", os totais do funil e os topos da curva passam a bater com os acelerômetros (MQL 97, RM 85, RR 54, Prop 33, Venda 0).

## Fora de escopo

Acelerômetros, hooks de analytics por BU e demais abas — sem mudanças.
