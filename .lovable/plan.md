## Override Libracom: tratar `pontual` como `mrr` (apenas este cliente)

No `src/hooks/useJornadaData.ts`, dentro do loop de `projetos` (após o cálculo atual de `mrr` e `pontual`, ~linhas 302-303), adicionar uma exceção específica para o cliente **Libracom** do CFO Dago:

```ts
// Override específico Libracom: o valor lançado como pontual é, na verdade, recorrente
let mrr = isPontualOnly ? 0 : (valorCfoaas + valorOxy);
let pontual = valorDiagnostico + valorTurnaround + valorValuation + valorEducacao + (isPontualOnly ? valorCfoaas : 0);

if (tituloLower.includes('libracom')) {
  mrr = mrr + pontual;
  pontual = 0;
}
```

### Efeito

- Para o card cujo título contém "libracom" (case-insensitive, normalizado), o valor que estava em `pontual` é somado ao `mrr` e `pontual` zera.
- Reflete automaticamente em todas as métricas que usam `mrr` (ranking de CFO do Dago, MRR total do squad, P&L, GMV).
- Nenhum outro cliente é afetado.

### Arquivos alterados

- `src/hooks/useJornadaData.ts` — apenas adição do bloco de override após o cálculo de mrr/pontual