## Objetivo
Expandir o popover do "Gap a Realocar" para listar todos os 12 meses do ano, mostrando MRR projetado, MRR real (Oxy quando fechado, projeção quando futuro) e Δ.

## Mudança única
Arquivo: `src/components/planning/MediaInvestmentTab.tsx` (bloco do popover, ~linhas 778–861).

### Comportamento novo do `breakdown`
- Em vez de filtrar `Math.abs(gap) > 1`, mapear **todos os 12 meses** do `funnelData`.
- Para cada mês, definir `tipoFonte`:
  - **"Oxy"** quando o mês tem `mrrBase` real (`mrrBaseGap !== 0` ou flag de fechado): coluna "Real" = `mrrBase`.
  - **"Projeção"** quando não tem Oxy: coluna "Real" = `mrrBaseProjetado` (a chain já calculada com 0,95 + 25% das vendas anteriores).
- `gap` continua sendo `mrrBaseGap` (0 para meses futuros).

### UI do popover
- Adicionar nova coluna "Fonte" (badge pequeno: `Oxy` cinza / `Projeção` outline).
- Linhas com Δ=0 ficam em cinza claro (sem destaque vermelho/verde).
- Total a realocar continua somando só gaps positivos dos meses Oxy.
- Rodapé atualizado: *"Meses fechados usam Oxy. Meses futuros usam projeção (MRR anterior × 0,95 + 25% das vendas anteriores)."*
- Aumentar largura do popover de `w-[420px]` para `w-[480px]` para caber a coluna extra.
- Adicionar `max-h-[420px]` para suportar 12 linhas.

### Sem mudanças em
- Cálculo de `mrrBaseGap` no useMemo (linhas ~1480–1546).
- Hook `usePlanGrowthData`.
- Banco de dados, Edge Functions, outros componentes.

## Validação
- Jan/Fev → Real = Oxy, Δ pequeno (sincronizado).
- Mar/26 → Real = R$ 733.281 (Oxy), Δ destacado se ≠ projetado.
- Abr/26 → Real = R$ 700.153 (Oxy), Δ destacado.
- Mai–Dez/26 → Real = projeção (Abr × 0,95^n + acumulado das vendas), Δ = R$ 0, fonte "Projeção".
- Total a realocar inalterado (só conta gaps Oxy positivos).