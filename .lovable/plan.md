## Corrigir shift de 1 mês no MRR Base (Jan–Abr/2026)

### Diagnóstico
O Marco preencheu os valores com label deslocado: o que ele rotulou como "Mar" era o MRR real de **Abr**, e o que rotulou como "Abr" era o de **Mai**. A correção é re-alinhar usando os valores oficiais da Oxy para cada mês correto.

### Valores Oxy (CaaS+SaaS, sem Setup/Serv. Especializados) por mês competência

| Mês | Cálculo | Total Oxy |
|---|---|---:|
| **Jan/26** | 567.257,36 + 74.255,29 + 0 + 3.180,71 + 0 + 12.776 + 47.799 + 0 | **R$ 705.268,36** |
| **Fev/26** | 611.730,17 + 74.255,29 + 1.800 + 3.180,71 + 0 + 11.779 + 44.102 + 0 | **R$ 746.847,17** |
| **Mar/26** | 626.506,13 + 52.685,29 + 4.797 + 3.180,71 + 0 + 10.282 + 35.830 + 0 | **R$ 733.281,13** |
| **Abr/26** | 600.919,17 + 52.685,29 + 4.797 + 3.180,71 + 0 + 6.088 + 32.482,40 + 0 | **R$ 700.152,57** |

### Comparação com DB atual

| Mês | DB atual | Oxy correto | Δ |
|---|---:|---:|---:|
| Jan | 705.268,07 | 705.268,36 | +0,29 ✅ ok (arredondamento) |
| Fev | 746.847,17 | 746.847,17 | 0 ✅ ok |
| **Mar** | **755.281,13** | **733.281,13** | **−22.000** ❌ |
| Abr | 700.152,57 | 700.152,57 | 0 ✅ ok |

**Conclusão:** o shift afeta **somente Mar**. Jan, Fev e Abr já estão corretos. O valor 755.281 que está em Mar foi um erro de digitação meu na rodada anterior (somei errado), não shift do Marco.

### Passos

**1. Backup CSV (`/mnt/documents/mrr_base_backup_2026-05-04_v2.csv`)**

**2. Update apenas Mar/2026**
- `Mar = 733.281,13`, `is_total_override = false`, `updated_at = now()`

**3. Verificação final**
- Re-query `mrr_base_monthly` 2026 e confirmar que os 4 meses batem 100% com a Oxy.

### Fora de escopo
- Não tocar em Jan/Fev/Abr (já corretos).
- Não buscar Mai/2026 da Oxy (não é necessário — a regra é label = competência da Oxy, não shift).
- Não alterar `monetary_metas`, `funnel_metas`, ou hooks.
