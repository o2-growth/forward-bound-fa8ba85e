Diagnóstico preciso:

1. O backup existe e foi gravado corretamente
- A tabela `bu_investment_snapshots` tem os snapshots de Mar/Abr/Mai 2026 para `o2_tax` e `oxy_hacker`.
- Os registros guardam o valor anterior e `investimento_novo = 0`, então há rastreabilidade para rollback.

2. O zeramento chegou a acontecer no banco
- Às 20:39:17, os 6 registros de Mar/Abr/Mai foram atualizados para:
  - `investimento = 0`
  - `is_locked = false`

3. O próprio app reverteu os valores 45 segundos depois
- Às 20:40:02, o `audit_log` mostra um usuário logado (`jv241004@gmail.com`) atualizando novamente os mesmos 6 registros para os valores antigos e travando de novo:
  - O2 TAX Mar/Abr/Mai: `23321`, `is_locked = true`
  - Oxy Hacker Mar: `15000`, `is_locked = true`
  - Oxy Hacker Abr/Mai: `20000`, `is_locked = true`

4. Causa raiz no código
- Existe um auto-lock no `usePlanGrowthData.ts` que roda ao carregar a tela.
- Quando um mês passado/atual está com `is_locked = false`, ele recria o snapshot automaticamente com os valores calculados do funil.
- Por isso, ao zerarmos e destravarmos Mar/Abr/Mai, o app entendeu que precisava “re-travar” esses meses e regravou os investimentos antigos.

5. Por que Jun–Dez continuam zerados
- Jun–Dez estão com `investimento = 0` e `is_locked = false`, mas ainda não são meses auto-lockáveis na lógica atual. Por isso não foram revertidos.

Conclusão:
- O problema não é cache nem erro visual.
- O problema é uma regra automática de front-end que reverte meses já iniciados quando estão destravados.

Plano de correção pro próximo passo:

1. Corrigir a regra de auto-lock
- Ajustar `usePlanGrowthData.ts` para não auto-travar novamente O2 TAX e Oxy Hacker nos meses de Mar a Dez/2026 quando o investimento deve permanecer zerado.
- Isso evita que o app sobrescreva o banco de novo.

2. Reaplicar o zeramento com backup preservado
- Atualizar novamente `funnel_metas` apenas para O2 TAX e Oxy Hacker, Mar/Abr/Mai 2026:
  - `investimento = 0`
  - manter/destravar conforme a nova regra segura
- Não mexer em Modelo Atual, Franquia, leads, MQLs, RMs, RRs, propostas, vendas ou metas de faturamento.

3. Validar o resultado
- Conferir no banco que Mar–Dez/2026 estão zerados para O2 TAX e Oxy Hacker.
- Conferir que a tela não consegue mais reverter automaticamente esses valores.