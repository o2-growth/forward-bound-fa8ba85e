## Sobrescrever MRR Base (Jan–Abr/2026) com valores reais da Oxy + backup

### Diagnóstico
Os 4 meses no DB estão com `is_total_override = true` e divergentes da Oxy:

| Mês | DB atual | Oxy (regra CaaS+SaaS sem Setup/Serv. Esp.) | Δ |
|---|---:|---:|---:|
| Jan | R$ 967.968,89 | **R$ 705.268,07** | −R$ 262.700 |
| Fev | R$ 809.975,81 | **R$ 746.847,17** | −R$ 63.128 |
| Mar | R$ 667.987,00 | **R$ 755.281,13** | +R$ 87.294 |
| Abr | R$ 667.987,00 | **R$ 700.152,57** | +R$ 32.165 |

### Passos

**1. Backup CSV (`/mnt/documents/`)**
- Exportar `mrr_base_monthly` (year=2026) atual para `mrr_base_backup_2026-05-04.csv` com colunas: `month, year, value, is_total_override, updated_at`.
- Mostrar o caminho via `<lov-artifact>` para o usuário baixar.

**2. Update no DB (via tool de insert/update)**
- Atualizar Jan, Fev, Mar, Abr/2026 com os valores Oxy acima.
- Setar `is_total_override = false` (reabilita sync automático no futuro).
- Setar `updated_at = now()`.

**3. Verificação**
- Re-query `mrr_base_monthly` ano 2026 para confirmar os 4 meses atualizados.

### Fora de escopo
- Não rodar a edge function `sync-mrr-base` (faria a mesma coisa, mas direto via SQL é mais auditável e rápido aqui).
- Não tocar em `monetary_metas`, `funnel_metas`, ou cálculos de Plan Growth (que vão refletir automaticamente).
- Não alterar memória `MRR Base 2026 Starting Point` (R$ 667.987 era um valor histórico de Mar; agora a fonte da verdade vira a Oxy real).
