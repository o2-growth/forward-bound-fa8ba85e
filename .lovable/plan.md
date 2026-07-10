
## Escopo (restrito a Outbound)

Aplicar a nova regra de RR **apenas** no funil do pipe Outbound (`src/hooks/useOutboundAnalytics.ts` — tabela `pipefy_moviment_outbound`, SDR fixo Matheus Staruck). Modelo Atual, O2 TAX, Expansão, marketing agregador e verificador Pipefy **ficam intocados**.

## Regra nova de RR (só Outbound)

Card do pipe Outbound conta 1x como RR no mês M (dedup `id|mês`) se qualquer uma:

1. Visitou fase mapeada como RR no mês M. *(regra atual mantida)*
2. **[NOVO]** Visitou no mês M `Proposta enviada / Follow Up`, `Contrato assinado` ou `Ganho`, E o histórico do card tem passagem anterior por fase mapeada como RM (`Reunião agendada / Qualificado`).
3. **[NOVO]** Visitou no mês M `Contato futuro` **vindo diretamente** de fase mapeada como RM (fase imediatamente anterior no `phases_history` ordenado por `firstTimeIn`).

Exclusões atuais mantidas (test cards, motivos de perda, dedup).

## Onde tocar

- `src/hooks/useOutboundAnalytics.ts` — só o bloco de agregação de RR.

Nada mais é alterado. Modelo Atual, O2 TAX, Expansão, `marketingFunnelAggregator`, `pipefy-verify-modelo-atual`: **sem mudança**.

## Impacto

- **Só Outbound.** Nenhum outro funil, meta, DRE ou monetário muda.
- Regra é aditiva → meses passados de Outbound só podem ganhar RRs, nunca perder. Dedup `id|mês` evita dupla contagem.
- Panelaço Pet (1387327144) passa a contar via regra 2 (foi p/ Proposta enviada). Grupo Moas (1406950101) passa a contar via regra 3 (Reunião agendada → Contato futuro).

## Validação

1. Typecheck.
2. Abrir dashboard Outbound em Jul/2026 e conferir que Panelaço e Moas aparecem em RR (drill-down).
3. Spot-check meses passados de Outbound: RRs adicionais devem ser justificáveis (cards que avançaram para Proposta/Ganho ou Contato futuro pós-RM).
