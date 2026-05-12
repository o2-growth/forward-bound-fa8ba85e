## Alteração

No arquivo `src/components/planning/CustomerSuccessTab.tsx`, trocar os dois usos do MRR base hardcoded de `847892` para `724400`:

- Linha 375: `mrrBase={847892}` → `mrrBase={724400}`
- Linha 472: `activeMrr={847892}` → `activeMrr={724400}`

Mesmo lugar onde antes ajustamos para 847k. Sem mudanças de lógica.