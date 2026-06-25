## Alinhar contador de clientes do card de CFO com a regra de carteira (Pedrolo & Mariana)

### Problema
- Card resumo do CFO mostra 35 (carteira ativa total).
- Modal/lista do squad mostra 5 (regra especial: só assinados no mês calendário anterior).

A regra do "mês passado" só está sendo aplicada em `activeClientes` (modal), mas não na agregação que alimenta `cfos[].clientes` (card).

### Mudança
Arquivo: `src/components/planning/jornada/CfoView.tsx`

1. Extrair a regra de elegibilidade da carteira (a função interna que já usa `isMari`, `isPedrolo`, `inMesPassado`, `temAssessoriaFinanceira`, e exclui `INACTIVE_PHASES`) para um helper `isClienteNaCarteira(c)` no escopo do componente, baseado em `clientesPeriodo` quando houver `dateRange`, ou em `clientes`.

2. Reusar esse helper em dois pontos:
   - `activeClientes` (modal) — já é o comportamento atual, mantém igual.
   - Agregação `cfos` (linhas 788–823) e também o caminho `propCfos` (quando não há `dateRange`):
     - Quando há `dateRange`: ao invés de `ativos = lista.filter(c => !INACTIVE_PHASES.includes(c.faseAtual))`, usar `ativos = lista.filter(isClienteNaCarteira)`.
     - Quando NÃO há `dateRange`: recalcular `cfos` a partir de `clientes` aplicando o mesmo `isClienteNaCarteira`, em vez de usar `propCfos` cru — assim Pedrolo/Mariana respeitam a regra também no fluxo sem filtro. Para os demais CFOs nada muda (o helper retorna `true` por padrão).

3. Garantir que `selectedCfoData.clientes`, `mrrTotal`, `clientesTratativa`, etc. usados no modal venham dessa mesma agregação re-filtrada, para que **header do card, modal, "Composição do Squad" e Simulador de Carteira mostrem o MESMO número** (5 e não 35 no caso do Pedrolo).

4. Sem mudanças em `INACTIVE_PHASES`, `CHURN_PHASES`, churns, custo de squad, ou em nenhum outro CFO.

### Resultado
- Pedrolo: card e modal mostram o mesmo número (ex.: 5 clientes assinados no mês passado).
- Mariana: idem, respeitando exceção da Assessoria Financeira recorrente.
- Demais CFOs: comportamento idêntico ao atual.