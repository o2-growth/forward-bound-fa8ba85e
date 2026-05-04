## MRR Base do Plan Growth puxando da Oxy (Modelo Atual)

### Escopo confirmado
- **CaaS + SaaS = Modelo Atual** (única BU afetada — O2 TAX, Oxy Hacker e Franquia continuam com a lógica atual).
- **Sobrescrita apenas de meses fechados**: Jan, Fev, Mar e Abr/2026. Maio em diante (mês corrente + futuros) continua projetado via churn 6% / retenção 25% no funil reverso.
- **Override manual** sempre prevalece (`is_total_override = true` na `mrr_base_monthly` é respeitado pelo sync).

### Subcategorias Oxy = MRR (a confirmar antes do código)
**CaaS — incluir:** Enterprise, Corporate, BPO Financeiro
**SaaS — incluir:** Enterprise, Corporate, BPO Financeiro
**EXCLUIR de ambos:** Serviços Especializados, Setup, qualquer one-shot
> Confirma se "BPO Financeiro" entra ou se quer só Enterprise+Corporate.

---

### Alterações no Plan Growth

**Arquivo único de UI:** `src/components/planning/MediaInvestmentTab.tsx`

1. **Hidratar `mrrDynamic` (linhas 1247–1257)** — antes de chamar `calculateMrrAndRevenueToSell`, ler `mrr_base_monthly` via `useMrrBase` e montar um `mrrRealizadoPorMes` apenas com Jan–Abr.

2. **Refatorar `calculateMrrAndRevenueToSell` (linhas 138–181)** — aceitar parâmetro novo `mrrRealizadoPorMes`. Dentro do loop:
   - Se mês ∈ {Jan, Fev, Mar, Abr} e tem valor → `mrrAtual = mrrRealizadoPorMes[month]` (ignora churn/retenção).
   - Mai em diante → segue fórmula atual, partindo do MRR real de Abril como ponto de partida (não mais do `mrrInicial` manual).

3. **Indicador visual de origem** na coluna "MRR Base" da tabela (linha 541):
   - 🔄 Oxy (sync) | ✏️ Manual (override) | 📈 Projetado (Mai+)
   - Tooltip com data do último sync.

4. **Botão "Sincronizar com Oxy"** acima da tabela do Modelo Atual — chama edge function `sync-mrr-base` e invalida cache.

5. **Inputs manuais (linhas 1803–1830)**:
   - **MRR Inicial** vira read-only mostrando valor sincronizado de Jan/Oxy (com botão "Editar" para criar override).
   - **Valor A Vender Inicial (Jan)** = `Meta Jan − MRR Base Jan (Oxy)`, ainda editável.
   - Sliders de churn/retenção continuam afetando só Mai–Dez.

---

### Backend (já no plano anterior aprovado)

- **Edge function `sync-mrr-base`**: chama `fetch-oxy-finance` action `dre_categories` para Jan–Abr/2026, soma só as subcategorias acima, e faz upsert em `mrr_base_monthly` (pulando linhas com `is_total_override = true`).
- **`useMrrBase.ts`**: ganha mutation `syncFromOxy(year)`.

### O que NÃO muda
- Outras BUs (O2/Oxy Hacker/Franquia).
- Funil reverso vendas → propostas → leads.
- Sistema de batch save / pendingChanges / redistribuição.
- Aba Admin > Metas Monetárias (recebe o mesmo botão de sync).

**Próximo passo:** confirma se BPO Financeiro entra no MRR e eu implemento.