## Objetivo
Corrigir apenas o mês de **Julho/2026** na cascata da aba **Plan Growth › Modelo Atual**, sem alterar nenhum outro mês (passados ou futuros).

## Diagnóstico (já confirmado)
A cascata em `src/components/planning/MediaInvestmentTab.tsx` lê **um único snapshot** de `getIndicators('modelo_atual', currentMonth)` e aplica o mesmo `ticketMedio`/`cpmql` a todos os 12 meses. Como o snapshot ativo tem ticket ≈ 8.524 e CPMQL ≈ 293, Julho aparece com 61 vendas / R$ 223.180 em vez de 29 vendas / R$ 183.000.

## Abordagem (mínima e cirúrgica)

Fazer um **override pontual apenas para Julho**, sem tocar na lógica dos demais meses:

1. No trecho onde a cascata itera os meses (linhas ~1341-1400 de `MediaInvestmentTab.tsx`), quando `month === 'Jul'` **e** `bu === 'modelo_atual'`, buscar `getIndicators('modelo_atual', 'Jul')` e usar esses valores (`ticketMedio`, `cpmql`, `mqlToRm`, `rmToRr`, `rrToProp`, `propToVenda`) somente para a linha de Julho.
2. Para todos os outros meses (Jan-Jun, Ago-Dez) e todas as outras BUs (O2 TAX, Oxy Hacker, Franquia): **nada muda** — continuam usando o snapshot atual exatamente como hoje.

## Resultado esperado (Julho, Modelo Atual)
Com `ticket=18.000`, `CPMQL=500`, taxas 50/85/75/25% e A Vender = R$ 520.000:

| Coluna | Valor |
|---|---:|
| Vendas | 29 |
| Propostas | 116 |
| RRs | 155 |
| RMs | 183 |
| MQLs | 366 |
| Leads | 852 |
| Investimento | R$ 183.000 |

## Fora de escopo
- Não refatorar a leitura para `metricsByMonth` completo (fica para depois, se quiser).
- Não alterar nenhuma outra BU.
- Não alterar nenhum outro mês.
- Não mexer em `bu_indicators_config` do banco.

## Validação
Após a mudança, conferir na tela que:
- Julho/Modelo Atual bate com a tabela acima.
- Jun/2026 e Ago/2026 (vizinhos) continuam com os mesmos números que estão hoje.
- Outras BUs (O2 TAX, Oxy Hacker, Franquia) inalteradas.
