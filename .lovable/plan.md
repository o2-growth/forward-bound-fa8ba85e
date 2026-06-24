# Inferir produto a partir dos campos Valor quando "Produtos" estiver vazio

## Diagnóstico

A screenshot do usuário mostra 32 contratos em "Proposta enviada / Follow Up" classificados como "A definir" com MRR R$176k e Setup R$439k — ou seja, **os valores monetários estão no banco**, só o campo textual "Produtos" não está preenchido.

Confirmação no banco (fase Proposta enviada, ano 2026):

| Campo | Cards com valor > 0 |
|---|---:|
| Valor MRR | 195 / 311 |
| Valor Setup | 243 / 311 |
| Valor Pontual | 30 / 311 |
| Valor CFOaaS / OXY / Diag / Turn / Val / Edu | 0 |

Conclusão: os times preenchem `Valor MRR` + `Valor Setup` no card de proposta, mas não o textual "Produtos". Dá para inferir a categoria pelos campos numéricos sem inventar nada.

## Regra de inferência (apenas quando `Produtos` vazio + sem match em `pipefy_db_clientes`)

Ordem de teste, primeiro match vence:

1. `Valor OXY > 0` → **OXY**
2. `Valor Turnaround > 0` → **Turnaround**
3. `Valor Valuation > 0` → **Valuation**
4. `Valor Diagnostico > 0` (ou `Valor Diagnóstico Estratégico`) → **Diagnóstico Estratégico**
5. `Valor Educação > 0` → **Educação**
6. `Valor MRR > 0` OR `Valor CFOaaS > 0` → **CaaS** (recorrente; cobre os 195 cards com MRR)
7. `Valor Setup > 0` (sem MRR/CFOaaS) → **Setup** (projeto one-shot)
8. Nenhum dos acima → **A definir** (mantém tooltip explicativo)

## Mudanças

1. **`src/lib/productClassifier.ts`** — adicionar função `inferProductFromValues(card)` que recebe os campos `valorMRR`, `valorSetup`, `valorPontual` já parseados em `ModeloAtualCard` mais os campos brutos (`Valor OXY`, `Valor Turnaround`, `Valor Valuation`, `Valor Diagnostico`/`Valor Diagnóstico Estratégico`, `Valor Educação`, `Valor CFOaaS`) e devolve `ProductCategory | null`. Retorna `null` quando todos os campos forem ≤ 0 (preserva "A definir" real). Atualizar comentário do header para incluir o passo 3 (inferência por Valor).

2. **`src/hooks/useModeloAtualAnalytics.ts`**
   - Em `parseCardRow`, capturar os campos brutos extras necessários (`Valor OXY`, `Valor Turnaround`, `Valor Valuation`, `Valor Diagnostico`, `Valor Diagnóstico Estratégico`, `Valor Educação`, `Valor CFOaaS`) num objeto `valoresExtras` dentro de `ModeloAtualCard` (campo opcional, não vaza para fora).
   - Em `toDetailItem` (linha ~597), depois do lookup em `produtosMap` e antes de `classifyProduto`, se `produtoRaw` ainda estiver vazio chamar `inferProductFromValues(card)`. Se retornar não-nulo, usar esse valor diretamente como `productCategory` (pular `classifyProduto` para evitar dupla normalização).

3. **`src/hooks/useO2TaxAnalytics.ts`** — mesma inferência aplicada ao O2 TAX (cards desse pipe quando aparecerem em proposta). Padrão dominante esperado: `Valor OXY` > 0 → OXY. Mudança simétrica em `toDetailItem`.

4. **Expansão / Oxy Hacker** — já recebem produto via pipe (Franquia/Oxy Hacker direto), não precisam mudar.

5. **`src/components/planning/indicators/DetailSheet.tsx`** — sem mudanças (tooltip "A definir" continua válido para os cards que ainda não tiverem nenhum Valor preenchido, ex.: Reunião agendada pura).

## Validação

- Acelerômetro Comercial → drill-down Proposta de Modelo Atual: os 32 cards "A definir" da screenshot devem virar **CaaS** (têm Valor MRR > 0) ou **Setup** (só Valor Setup). Total de "A definir" cai drasticamente.
- "Deon Calçados" (MRR 15.383, Total 29.383) deve virar **CaaS**.
- Totais monetários (MRR R$194k, Setup R$482k, Pontual R$2.0M, Total R$2.7M) **permanecem inalterados** — a inferência só muda o label, não os valores.
- Cards em Reunião agendada/RR sem nenhum Valor preenchido continuam "A definir" com tooltip.
- Categorias Franquia (19) e Oxy Hacker (10) inalteradas.
