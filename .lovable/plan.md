# Investigar por que RM/RR/Prop/Venda do Thiago aparecem zerados

Os valores foram gravados no banco com sucesso (confirmado por SELECT): Thiago Jun/2026 → RM=70, RR=59, Prop=53, Venda=8. Mesmo assim, no dashboard só a meta monetária aparece.

## Hipótese principal

O hook `useCloserAbsoluteMetas` usa `staleTime: 30 * 60 * 1000` (30 min). O React Query provavelmente está servindo a versão antiga em cache, onde só `faturamento_meta` tinha valor. O gauge de Fat Incremento também usa o mesmo cache, mas como esse campo já estava preenchido antes, aparenta funcionar.

## Passos

1. Abrir o dashboard via Playwright autenticado, filtrar Modelo Atual + Jun/2026 + closer Thiago, e verificar screenshot dos gauges RM/RR/Proposta/Venda.
2. Se aparecerem 70/59/53/8 → o problema era só cache; instruir usuário a dar refresh (Ctrl+Shift+R) e não mudar código.
3. Se ainda aparecerem 0 → depurar: verificar que `closerAbsMetas` contém o registro (log/console), conferir `firstNameKey('Thiago')` vs `firstNameKey(m.closer)`, e checar se `anySelectedCloserManaged` retorna true para Thiago em 2026.
4. Fix conforme diagnóstico. Provável ajuste: reduzir `staleTime` do hook ou invalidar a query no mount da aba, caso o cache seja o culpado.

Sem mudanças de código antes da validação.
