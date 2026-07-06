
## Objetivo
Validar se as metas de Modelo Atual para Julho/2026 (Closers, SDRs e Faturamento) configuradas no dashboard batem com os valores da planilha enviada.

## Valores esperados (planilha, mês inteiro)

**Closers (R.M / R.R / Proposta / Venda / Meta R$ / Ticket):**
- Daniel: 87 / 74 / 67 / 10 / R$ 220.000 / R$ 22.000
- Amanda: 70 / 59 / 53 / 8 / R$ 100.000 / R$ 12.500
- Thiago (Zanoni): 87 / 74 / 67 / 10 / R$ 200.000 / R$ 20.000

**SDR (mês):**
- Carlos: R.M 179 / R.R 140

**Faturamento (Incremento):**
- Total R$ 520.000 · MRR (25%) R$ 130.000 · Setup R$ 390.000

## Passos
1. Rodar script Playwright com sessão Supabase injetada; acessar `/planning-2026` (aba Indicadores / Comercial - Modelo Atual).
2. Ajustar filtro para mês inteiro Jul/2026 e BU = Modelo Atual.
3. Capturar screenshots dos cards:
   - Metas por Closer (Daniel, Amanda, Thiago) → R.M, R.R, Proposta, Venda, Meta R$, Ticket
   - Meta SDR (Carlos) → R.M, R.R
   - Meta Faturamento Incremento → Total, MRR, Setup
4. Comparar valores exibidos × planilha; listar divergências (esperado × atual × delta).

## Entrega
Relatório curto no chat com tabela de conferência + screenshots anexadas. Nenhuma alteração de código nesta etapa — se houver divergência, proponho ajuste em seguida.
