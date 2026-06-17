## Contexto

Hoje a regra de "motivo de perda que desqualifica MQL" (`MQL_EXCLUDED_LOSS_REASONS` em `useModeloAtualMetas.ts`: Duplicado, Pessoa física / fora do ICP, Não é demanda real, Buscando parceria, Quer soluções para cliente, Não é MQL mas entrou como MQL, Email/Telefone Inválido) é aplicada **apenas** na contagem de MQL — em **Modelo Atual** (`useModeloAtualAnalytics`) e **O2 TAX** (`useO2TaxAnalytics`).

Esses mesmos cards, se passaram por "Reunião agendada / Qualificado", "Reunião Realizada", "Proposta enviada / Follow Up" ou "Contrato assinado" antes de cair em Perdido, **continuam contando** em RM, RR, Proposta e Venda. Isso bagunça a leitura do funil — se o lead não vale como MQL, não pode aparecer como reunião/proposta também.

## Parte 1 — Investigar os MQLs do mês atual

Os cards que você listou (Paiêfilho, Google, Leonardo, G4 PicPay, G4) provavelmente são os MQLs criados em Jun/2026 no Modelo Atual. O histórico de fases já está disponível na UI via **drill-down do acelerômetro MQL** → o `DetailSheet` abre o `CardInvestigator`, que mostra todas as movimentações (Fase Origem → Fase Destino + Entrada + Motivo de Perda) buscando de `pipefy_moviment_cfos` via `query-external-db`.

Se você quiser, na mesma entrega:
- Adiciono no `CardInvestigator` uma timeline visual (Fase → Fase com data) já ordenada cronologicamente.
- Logo um JSON dos MQLs do mês atual no console para você conferir os 5 nomes citados.

## Parte 2 — Aplicar exclusão por motivo de perda em todo o funil

### Arquivos a editar

**`src/hooks/useModeloAtualAnalytics.ts`** — `getCardsForIndicator`:
- Onde hoje o filtro `excludedMqlIds.has(card.id)` só existe no branch `indicator === 'mql'`, estender para **rm, rr, proposta, venda**: descartar `card` se `excludedMqlIds.has(card.id)`.
- Mesma exclusão em `firstEntryByCardAndIndicator` (linhas ~405–440).
- Aplicar também no chart agregado de movimentações (`useMemo` que monta `cards.filter` por mês).

**`src/hooks/useO2TaxAnalytics.ts`** — análogo:
- O `excludedMqlIds` já existe (linha 266). Aplicar `excludedMqlIds.has(id)` nos branches de rm/rr/proposta/venda em `getCardsForIndicator` (hoje só usado em `mql`, linha 378).
- Aplicar no agregado mensal.

**`src/hooks/useIndicatorsRealized.ts`** — o `excludedMqlIds` já é construído (linha 211); estender o mesmo filtro às contagens de rm/rr/proposta/venda do Modelo Atual e O2 TAX (manter Expansão sem exclusão — Expansão não usa essas regras de motivo de perda).

**`src/components/planning/IndicatorsTab.tsx`** — atualizar o copy do tooltip do MQL (linha 1774) e replicar a mesma nota nos cards de RM/RR/Proposta/Venda: "Exclui leads cujo motivo de perda invalida o MQL (Duplicado, ICP fora, etc.)".

### O que NÃO muda

- Lista de motivos (`MQL_EXCLUDED_LOSS_REASONS`) — fica como está.
- Expansão e Outbound — não compartilham essa regra de exclusão.
- Valores monetários (MRR/Setup/Pontual) realizados via Oxy Finance — fora desse fluxo.
- Lock de funnel_metas / consolidated metas — intocados.

### Validação

Após o deploy, abrir Indicadores → Comercial → Modelo Atual no mês atual:
- Acelerômetro MQL: número não muda.
- RM/RR/Proposta: devem **cair** pelo total de cards excluídos (badge "X excluídos" do MQL).
- Drill-down de cada card excluído: aparece em "Perdidos por motivo" mas **não** mais em RM/RR/Proposta.

## Pergunta antes de implementar

Você quer que eu também adicione a timeline de fases visual no `CardInvestigator` (Parte 1, item opcional), ou só aplico a regra de exclusão downstream (Parte 2)?
