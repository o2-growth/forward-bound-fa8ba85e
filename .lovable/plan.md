## Diagnóstico

1. **Closer**: meta cadastrada como "Amanda Serafim" / "Thiago" / "Bruna" não casa com "Amanda Teixeira Serafim" / "Thiago Zanoni" / "Bruna Patricio Mota" no Pipefy. Match exato lowercase falha.
2. **SDR**: `sdr_metas` armazena nomes curtos ('Carlos', 'Amanda', 'Matheus', 'Erica', 'Ana'), Pipefy retorna nome completo ("Carlos Ramos", etc). Nenhuma meta casa.
3. **Rank SDR poluído**: `getPersonName(role='sdr')` faz fallback para `item.responsible` (closer) quando `sdr` está vazio, então closers aparecem na tabela de SDRs.

## Correção

### Match por primeiro nome (normalizado)

Em `src/components/planning/indicators/PersonRanking.tsx`:

```ts
const firstName = (n: string) => n.trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .split(/\s+/)[0] || '';
```

- Agregação por pessoa: chave de grupo = primeiro nome normalizado; `display` = nome completo do Pipefy (primeira ocorrência encontrada).
- Lookup de meta: compara `firstName(metaRow.sdr/closer)` com `firstName(personDisplay)`.

Aplica nos dois lookups:
- SDR: filtra `sdrMetasHook.metas` por primeiro nome.
- Closer: ajusta `useCloserAbsoluteMetas.getMonthlyMap` para receber `firstName` e iterar comparando por primeiro nome.

### Remover fallback de closer no SDR

Em `PersonRanking.tsx`, `getPersonName` para `role='sdr'` usa apenas `item.sdr` (sem `item.responsible`). Cards sem SDR vão para "Sem SDR".

## Arquivos editados

- `src/components/planning/indicators/PersonRanking.tsx` — adicionar helper `firstName`, ajustar agregação e os dois lookups de meta, remover fallback `responsible` no role SDR.
- `src/hooks/useCloserAbsoluteMetas.ts` — `getMonthlyMap` passa a comparar por primeiro nome normalizado.

## Não muda

- Schema do DB (nomes cadastrados continuam como estão).
- Cards "Por SDR" / "Por Closer" / breakdown semanal (não tocar — só o `PersonRanking`).
- `useSdrMetas.getSdrMetaTotals` (usado em outros pontos do dashboard com filtros próprios).

## Validação

Após o fix, com filtro de Maio/26:
- Daniel: meta continua aparecendo (já casava).
- Amanda Teixeira Serafim: deve mostrar RM 44 (rateado por dias úteis), RR 23, Prop 10, Venda 5.
- Thiago Zanoni: idem Amanda.
- SDR rank: só Carlos Ramos, Erica, Ana, Matheus, Bruna (se cadastrada como SDR) aparecem; closers somem da lista.