## Objetivo
Cadastrar as metas de SDR de Maio/2026 conforme imagem (Carlos, Érica, Ana) e garantir que o filtro de período (mês/semana/dia) reduza proporcionalmente a meta exibida nos gauges R.M. e R.R.

## Metas (Maio/2026)
- **Carlos** — R.M. 82 / R.R. 70 → BUs: `modelo_atual`, `franquia`, `oxy_hacker`
- **Érica** — R.M. 82 / R.R. 70 → BU: `modelo_atual`
- **Ana** — R.M. 47 / R.R. 40 → BU: `modelo_atual`

> Observação: Carlos atende 3 BUs. Para evitar contar 3× o mesmo número quando o Consolidado estiver selecionado, gravarei o valor **integral em `modelo_atual`** e **0 em `franquia` e `oxy_hacker`**, mantendo Carlos disponível como opção em todas as 3 BUs (BU_SDRS). Se preferir distribuir (ex.: 30/30/22), me diga e ajusto.

## Mudanças

### 1. `src/hooks/useSdrMetas.ts`
- Adicionar `'Erica'` e `'Ana'` à lista `SDRS`.
- Atualizar `BU_SDRS`:
  - `modelo_atual: ['Amanda','Matheus','Carlos','Erica','Ana']`
  - `oxy_hacker: ['Amanda','Carlos']`
  - `franquia: ['Amanda','Carlos']`
  - `o2_tax: ['Carlos']` (sem mudança)

### 2. Banco — inserir metas Mai/2026
Upsert em `sdr_metas` (key `bu,month,year,sdr`):
```
modelo_atual / Mai / 2026 / Carlos → rm 82, rr 70
modelo_atual / Mai / 2026 / Erica  → rm 82, rr 70
modelo_atual / Mai / 2026 / Ana    → rm 47, rr 40
oxy_hacker   / Mai / 2026 / Carlos → rm 0, rr 0
franquia     / Mai / 2026 / Carlos → rm 0, rr 0
o2_tax       / Mai / 2026 / Carlos → rm 0, rr 0
```

### 3. Proporcional por período
**Nada a alterar** — `getSdrMetaForPeriod` já calcula `valor × (overlapDays / daysInMonth)`. Exemplos para Carlos em Maio (R.M. 82):
- Filtro 1–31 mai → 82 × 31/31 = **82**
- Filtro 1–7 mai → 82 × 7/31 ≈ **18,5**
- Filtro 1 dia → 82 × 1/31 ≈ **2,6**

### 4. Aba Admin → SDR Metas
Os 3 novos nomes aparecerão automaticamente na aba (depende de `BU_SDRS`), permitindo edição futura.

## Validação
- Filtro Maio cheio + SDR Carlos → R.M. meta = 82, R.R. = 70.
- Filtro 1–7 Maio + SDR Érica → R.M. ≈ 18,5; R.R. ≈ 15,8.
- Filtro Maio + Consolidado (todas BUs) sem filtro de SDR → R.M. soma = 82+82+47 + (Amanda 5) = 216; R.R. = 180.
- Filtro Maio + BU `franquia` + SDR Carlos → R.M./R.R. = 0 (esperado, valor está em modelo_atual).

**Arquivos afetados:** `src/hooks/useSdrMetas.ts` + 1 migration de inserção. Sem mudanças em Edge Functions ou auth.