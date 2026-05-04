## Objetivo

1. Criar aba **"Metas por SDR"** no Admin com metas de **Reunião Agendada (RM)** e **Reunião Realizada (RR)** por SDR/BU/mês.
2. Ocultar as abas **"Metas Monetárias"** e **"Metas CPx"** do menu do Admin.
3. **Refletir** essas metas no Dashboard Comercial (`IndicatorsTab`) quando o filtro de SDR estiver ativo: ao selecionar um ou mais SDRs, as metas de RM e RR mostradas (gauges/funil) passam a ser a **soma das metas dos SDRs selecionados** (interseccionadas com as BUs ativas), em vez da meta cheia da(s) BU(s).

## Atribuição de SDRs por BU

- Modelo Atual / Oxy Hacker / Franquia → Amanda, Carol
- O2 TAX → Carlos

## Banco de dados — nova tabela `sdr_metas`

```
id         uuid pk default gen_random_uuid()
bu         text not null      -- modelo_atual | o2_tax | oxy_hacker | franquia
month      text not null      -- jan..dez
year       int  not null default 2026
sdr        text not null      -- Amanda | Carol | Carlos
rm_meta    int  not null default 0   -- Reuniões Agendadas
rr_meta    int  not null default 0   -- Reuniões Realizadas
created_at, updated_at timestamptz default now()
unique (bu, month, year, sdr)
```

- RLS: leitura para autenticados; insert/update/delete somente `admin` (espelho de `closer_metas`).
- Trigger `audit_log_trigger_fn` anexado.

## Novos arquivos

- `src/hooks/useSdrMetas.ts` — espelho de `useCloserMetas`: expõe `BU_SDRS`, `getSdrsForBU(bu)`, leitura/atualização em lote de `rm_meta` e `rr_meta`, helper `getSdrMetaTotals({ bus, months, sdrs })` que retorna `{ rm, rr }` somando os registros que casam com o filtro.
- `src/components/planning/SdrMetasTab.tsx` — UI com seletor de BU, tabela `meses × SDRs` mostrando duas colunas por SDR (RM Meta e RR Meta), Salvar/Resetar (modelado a partir de `CloserMetasTab.tsx`).

## Edições

- `src/components/planning/AdminTab.tsx`:
  - Remover `TabsTrigger`/`TabsContent` de `monetary-metas` e `cost-stage-metas` e seus imports.
  - Adicionar `TabsTrigger value="sdr-metas"` + `<SdrMetasTab />`.
- `src/components/planning/IndicatorsTab.tsx`:
  - Onde hoje as metas de **RM e RR** são lidas de `funnel_metas` agregadas por BU/mês, passar a usar `useSdrMetas`:
    - Se `effectiveSelectedSDRs.length > 0` → meta RM/RR = soma de `sdr_metas` para `(BUs ativas, meses ativos, SDRs selecionados)`.
    - Se nenhum SDR selecionado → soma de TODOS os SDRs daquelas BUs/meses (mantém comportamento equivalente ao atual). **Fallback**: se `sdr_metas` estiver vazia para o recorte, manter o valor de `funnel_metas` atual para não zerar a meta.
  - Apenas RM e RR são afetadas. Leads, MQLs, RR→Prop, Vendas e metas monetárias permanecem como hoje.

## Ordem final das abas no Admin

1. Usuários
2. Metas Closers
3. **Metas SDR** (nova)
4. Logs

Os arquivos `MonetaryMetasTab.tsx` e `CostStageMetasTab.tsx` permanecem no repositório (apenas escondidos do menu).

## Fora de escopo

- Rateio de metas de Vendas/Pontual/Setup por SDR.
- Ajustes em Marketing/Plan Growth.
