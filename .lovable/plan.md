

User vê 2.048 Leads no funil Modelo Atual de Abril/2026. Suspeita de erro. Preciso investigar.

## Investigação

Vou:
1. Ler `useModeloAtualMetas` (especificamente `getQtyForPeriod('leads')`) para entender a lógica.
2. Ler `useFunnelRealized`/`PeriodFunnelChart` para confirmar de onde vem o `leadsQty`.
3. Comparar com a memória `mem://logic/indicators/leads-definition-modelo-atual` (Leads = união de cards que entraram em 'Novos Leads' OU 'MQLs').
4. Consultar o banco direto contando cards distintos no pipe Modelo Atual com fase 'Novos Leads' ou 'MQLs' em Abril/2026, para validar o número 2.048.
5. Cruzar com MQL=274 (esperado): se Leads inclui MQL, 2.048 - 274 = 1.774 cards "só lead". Faz sentido para Modelo Atual? Provavelmente sim — entrada bruta de leads é alta.

Hipóteses prováveis de "erro":
- A) Está somando MQLs também (por design, conforme memória), mas o user esperava só "Novos Leads".
- B) Está sem dedup mensal correta (contando entradas múltiplas por card).
- C) Está incluindo cards de outras BUs por engano.
- D) Período errado (puxando ano todo / outros meses).

Apresento plano para diagnóstico, não mudança de código ainda.

