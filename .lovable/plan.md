## Tratar receita Pontual da Mariana como MRR no clicável

A Mariana atende muitos clientes pontuais (Diagnóstico, Turnaround, Valuation) onde `cliente.mrr = 0` e `cliente.pontual > 0`. Hoje o `mrrTotal` agregado por CFO só soma `c.mrr`, então a Mariana aparece com MRR/margem zerados no card e dialog.

Solução cirúrgica: somar o `pontual` como se fosse MRR **apenas** na agregação por CFO da Mariana, sem mexer na lógica geral nem nos dados dos clientes.

### Mudança

Em `src/hooks/useJornadaData.ts`, na construção do `cfoMap` (linha ~477):

```ts
// antes
existing.mrrTotal += c.mrr;

// depois
const cfoNome = c.cfo ?? '';
const tratarPontualComoMrr = cfoNome.includes('Mariana');
existing.mrrTotal += c.mrr + (tratarPontualComoMrr ? (c.pontual ?? 0) : 0);
if (c.tratativaAtiva) {
  existing.mrrEmRisco += c.mrr + (tratarPontualComoMrr ? (c.pontual ?? 0) : 0);
}
```

(o `mrrEmRisco` segue a mesma regra para manter consistência no dialog)

### Efeito

- Card da Mariana, ranking, dialog (MRR Total, P&L, margem, ticket médio) e ordenação passam a refletir a receita pontual como se fosse recorrente.
- Demais CFOs ficam exatamente iguais.
- Nenhuma alteração em clientes individuais, simulador, totais globais ou outras telas.

### Arquivos alterados

- `src/hooks/useJornadaData.ts` — apenas o bloco de agregação por CFO
