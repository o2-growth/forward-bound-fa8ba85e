## Override RGO Máquinas e Guará Acessórios: tratar `pontual` como `mrr`

Em `src/hooks/useJornadaData.ts`, expandir o override que já existe para Libracom (~linha 305-308) para incluir mais dois clientes do Dago.

### Mudança

Substituir:
```ts
if (tituloLower.includes('libracom')) {
  mrr = mrr + pontual;
  pontual = 0;
}
```

Por:
```ts
const PONTUAL_TO_MRR_OVERRIDES = ['libracom', 'rgo', 'guará', 'guara'];
if (PONTUAL_TO_MRR_OVERRIDES.some(k => tituloLower.includes(k))) {
  mrr = mrr + pontual;
  pontual = 0;
}
```

(uso de `guará` e `guara` para garantir match com ou sem acento, já que o título lower mantém acentos.)

### Efeito

- Para os cards cujo título contenha "libracom", "rgo" ou "guará/guara" (case-insensitive), o pontual é realocado como MRR.
- Reflete em todos os cálculos do squad do Dago (ranking CFO, MRR total, P&L, GMV).

### Arquivos alterados

- `src/hooks/useJornadaData.ts` — apenas o bloco de override