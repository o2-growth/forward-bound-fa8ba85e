## O que eu conferi

Chamei a função `g4-metrics` e comparei lead a lead com a sua planilha (GMV = TCV = MRR×12 + Setup + Pontual).

| Cliente | GMV planilha | TCV dash | Status |
|---|---|---|---|
| Martinelli | 111.842,40 | 111.842,40 | OK |
| Petromar | 120.334,50 | 120.334,50 | OK |
| João Paulo | 30.000,00 | 30.000,00 | OK |
| Stillus Home | 20.000,00 | 20.000,00 | OK |
| Tchau Entrega | 12.000,00 | 12.000,00 | OK |
| Lotus Logística | 208.466,00 | 208.466,00 | OK |
| Invenzi | 148.644,00 | 148.644,00 | OK |
| **Fabrizio Mazza** | **30.000,00** | **60.000,00** | divergente (2×) |
| **B2G Vix** | **12.000,00** | **24.000,00** | divergente (2×) |

## Causas identificadas

**1. Duplicação de valor em Fabrizio e B2G Vix (o "TCV diferente" propriamente dito).**
Desde que passamos a ler os ganhos direto do Pipefy, o `g4-metrics` **soma todos os campos** do card cujo rótulo casa com `setup|implanta` (e idem para MRR/Pontual). Nesses dois cards o valor aparece exatamente dobrado (30k→60k, 12k→24k), o padrão típico de dois campos de setup preenchidos com o mesmo valor (ex.: "Setup" e "Valor do Setup/Implantação"). Os rótulos exatos ainda precisam ser confirmados — é o primeiro passo do plano, não vou assumir.

**2. O total do dash é maior que o total da planilha por desenho, não por erro.**
A planilha tem 9 linhas (Finders Fee). O dash tem outros ganhos atribuídos ao G4 que não estão na sua planilha: Sciensa (124.681,80), Fusão (163.841,20), Captable (117.841,20), Spa Med (2.000), Fauhome (14.960). Somando, o TCV do dash fica bem acima dos 693.286,90 da planilha mesmo depois de corrigir os itens 1.

## Plano

1. **Confirmar os rótulos**: adicionar um modo de diagnóstico temporário em `g4-metrics` (`?debugCard=1353771374`) que devolve os campos e valores brutos dos cards do Fabrizio e do B2G Vix, para ver exatamente quais rótulos estão sendo somados em dobro.
2. **Corrigir o somatório** em `supabase/functions/g4-metrics/index.ts`, conforme o achado — provavelmente deduplicando por valor+categoria ou restringindo os rótulos aceitos (`IGNORE_LABEL_RE` / lista de rótulos canônicos), em vez de somar tudo que casa com o regex.
3. **Revalidar** os 9 clientes contra a planilha: todos devem bater 100%.
4. **Remover** o modo de diagnóstico.

Não vou mexer nos demais ganhos (Sciensa, Fusão, Captable, Spa Med, Fauhome) — se você quiser que eles saiam do dash G4 ou virem uma seção separada da de Finders Fee, me diga e incluo.

### Detalhes técnicos
- Arquivo principal: `supabase/functions/g4-metrics/index.ts` (`fetchPipefyCardValues`, `SETUP_LABEL_RE`, `IGNORE_LABEL_RE`).
- O front (`G4ConsolidatedDashboard.tsx`) apenas consome o TCV já calculado; não precisa mudar.
