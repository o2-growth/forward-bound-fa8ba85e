## Problema
No tooltip do gráfico "Motivos de perda · Top 6", aparece literalmente `value : 2` porque o `<Bar dataKey="value" />` não tem `name` definido, então o Recharts usa a chave crua "value" como legenda do item. Os números (1, 2) são reais — são as contagens de leads perdidos por motivo (base pequena) — mas o rótulo confunde.

## Ajuste
Em `src/components/planning/g4/G4ConsolidatedDashboard.tsx`, no `LostReasonsBar`:

1. Dar `name="Perdidos"` ao `<Bar />` para o tooltip mostrar `Perdidos : 2` em vez de `value : 2`.
2. Adicionar `formatter` no `<Tooltip />` para exibir `"{n} perdido(s)"` e usar o próprio motivo (categoria do eixo Y) como título.

Aplicar tratamento equivalente no `EventsBarChart` (garantir que Leads/MQL/Ganho já têm nomes — já têm, mas confirmar o formatter fica consistente).

Sem mudança de dados nem de lógica de agregação.