## Objetivo

Tornar Maio/2026 (Modelo Atual) internamente consistente: hoje "A Vender = R$ 400k" e "Vendas = 24", mas o resto do funil (Propostas, RRs, RMs, MQLs, Leads) ainda reflete o snapshot antigo de R$ 95k / 6 vendas.

## Diagnóstico

- `funnel_metas` para Mai/2026 está com `is_locked = true`.
- Migração anterior atualizou só `faturamento_vender` e `vendas`, deixando o topo do funil congelado.
- Resultado: 24 vendas → 40 propostas → 46 RRs → 52 RMs → 128 MQLs → 297 leads (proporcional a 6 vendas, não a 24).

## Referência: Jan/Fev/26 (mesmo R$ 400k A Vender)
- 25 vendas, 165 propostas, 194 RRs, 215 RMs, 537 MQLs, 1.248 leads
- Taxas: prop→venda 15%, rr→prop 85%, rm→rr 90%, mql→rm 40%, lead→mql 43%

## Cálculo proposto para Maio/26 (Modelo Atual)

Partindo do que já está travado:
- A Vender = R$ 400.000
- Ticket Médio (config Modelo Atual, Mai) = puxar de `bu_indicators_config`; fallback R$ 17.000

Reverse funnel:
1. **Vendas** = round(400.000 / ticket_médio) → ~24 (mantém consistência)
2. **Propostas** = round(vendas / propToVenda)
3. **RRs** = round(propostas / rrToProp)
4. **RMs** = round(rrs / rmToRr)
5. **MQLs** = round(rms / mqlToRm)
6. **Leads** = round(mqls / leadToMql)

Usar as taxas e ticket médio do `bu_indicators_config` para Modelo Atual / Mai (mesma fonte que o Plan Growth usa nos meses não travados). Se config ausente, usar defaults (mqlToRm 0.49, rmToRr 0.72, rrToProp 0.88, propToVenda 0.24, leadToMql 0.43, ticket 17.000) — que produzem ~25/107/121/168/343/798.

## Passos

1. **Backup**: registrar valores atuais de `funnel_metas` Mai/2026 modelo_atual (mesmo padrão da última migração — guardar em comentário no SQL para reversão).
2. **Ler** `bu_indicators_config` para `bu='modeloAtual'`, `month='Mai'` antes de gerar a migração, para usar as taxas reais.
3. **Migração** UPDATE em `funnel_metas` (Mai/2026, modelo_atual) com os 6 campos recalculados, mantendo `is_locked = true`, `faturamento_meta`, `faturamento_vender`, `mrr_base_planejamento` inalterados.
4. **Validar** no Plan Growth e na aba Indicadores que o funil de Maio agora bate com Jan/Fev em proporção.

## Reversão

A migração incluirá no comentário os valores antigos exatos (297, 128, 52, 46, 40, 24) para reversão manual via UPDATE simples.

## Fora de escopo

- Não alterar lock, monetários (faturamento_meta, faturamento_vender, mrr_base_planejamento) — todos já estão corretos.
- Não recalcular outras BUs nem outros meses.
- Não mudar lógica de `lockMonths` (separar em uma melhoria futura, se desejado, para que edição de A Vender em mês travado dispare reverse funnel automático).
