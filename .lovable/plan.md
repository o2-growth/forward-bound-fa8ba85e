# Plano: Driver por Investimento para Jan-Abr (Modelo Atual)

## Objetivo
Fazer o cálculo do funil produzir naturalmente os valores corretos de Jan-Abr (Modelo Atual) sem sobrescrever o snapshot travado. A lógica que hoje só existe para Janeiro (vendas = invest / CPV) será generalizada para qualquer mês passado/atual que tiver "investimento planejado" definido.

## Valores-alvo (Modelo Atual)
| Mês | Vendas | Prop | RR | RM | MQL | Leads | Investimento |
|---|---|---|---|---|---|---|---|
| Jan | 24 | 99 | 112 | 155 | 316 | 735 | R$ 153.342 |
| Fev | 24 | 99 | 112 | 155 | 316 | 735 | R$ 191.678 |
| Mar | 30 | 123 | 140 | 194 | 395 | 918 | R$ 230.014 |
| Abr | 36 | 148 | 168 | 233 | 474 | 1.102 | R$ 249.181 |

## Backups (antes de qualquer alteração)
1. `funnel_metas` modelo_atual 2026 → CSV `funnel_metas_modelo_atual_pre-driver-investimento_2026-05-09.csv`
2. `bu_indicators_config` modelo_atual → CSV `bu_indicators_config_modelo_atual_pre-driver-investimento_2026-05-09.csv`
3. Cópia dos arquivos `usePlanGrowthData.ts` e `MediaInvestmentTab.tsx` com sufixo `.bak-driver-investimento-2026-05-09`

## Etapas

### 1. Schema: novo campo de Investimento Planejado por mês/BU
Adicionar coluna `investimento_planejado` (numeric, default 0) em `bu_indicators_config`. Esta coluna armazena o investimento orçado/planejado por mês — diferente de `funnel_metas.investimento` (que é resultado calculado/snapshot).

### 2. Dados: popular Jan-Abr
- `bu_indicators_config` (modelo_atual) Jan/Fev/Mar/Abr:
  - `mql_to_rm = 0.491`
  - `rm_to_rr = 0.722`
  - `rr_to_prop = 0.884`
  - `prop_to_venda = 0.243`
  - `cpv` por mês: Jan 6.389,25 / Fev 7.986,58 / Mar 7.667,13 / Abr 6.921,69
  - `investimento_planejado`: Jan 153.342 / Fev 191.678 / Mar 230.014 / Abr 249.181
  - `ticket_medio`: mantido como hoje (não influencia mais Jan-Abr quando driver é investimento)
- (Opcional) novo campo `lead_to_mql = 0.430` se ainda não existir; senão manter cálculo atual de Leads.

### 3. Lógica em `usePlanGrowthData.ts`: generalizar "modo Janeiro"
- Substituir o caso especial de Janeiro por uma regra geral: para qualquer mês onde `investimento_planejado > 0`, o funil é **driven por investimento**:
  ```
  vendas = round(investimento_planejado / cpv)
  propostas = ceil(vendas / propToVenda)
  rrs = ceil(propostas / rrToProp)
  rms = ceil(rrs / rmToRr)
  mqls = ceil(rms / mqlToRm)
  leads = ceil(mqls / leadToMql)
  investimento = investimento_planejado  // exato, sem recomputar
  ```
- Para os demais meses (sem investimento planejado), manter a lógica atual (vendas = aVender / ticket).
- Importante: as vendas geradas no modo investimento ainda alimentam a cadeia de MRR (mrr próximo mês += vendas × ticket × retenção), mantendo a projeção de MRR consistente.

### 4. Destravar Jan-Abr
- Setar `is_locked = false` em `funnel_metas` modelo_atual Jan-Abr 2026, para que o cálculo ao vivo seja exibido (em vez do snapshot antigo).
- Ao salvar/travar novamente no futuro, o snapshot vai refletir os valores calculados pela nova lógica.

### 5. UI: aba Plan Growth → Configurações
- Adicionar campo "Investimento Planejado (R$)" na grade mensal por BU (mesma tela onde já se editam ticket, CPV, taxas).
- Quando preenchido, mostrar badge "Driver: Investimento" no header do mês.

### 6. Validação
- Após o deploy, conferir na UI que Jan-Abr exibem exatamente: 24/99/112/155/316/735, 24/99/112/155/316/735, 30/123/140/194/395/918, 36/148/168/233/474/1.102 e os investimentos exatos.
- Conferir que Mai-Dez **não** sofreram alteração (não têm investimento planejado preenchido → caem na lógica atual).

## Detalhes técnicos

**Arquivos afetados:**
- `src/hooks/usePlanGrowthData.ts` — generalizar `investimentoInicialJan` → `investimentoPlanejadoPorMes`
- `src/hooks/useBUIndicatorsConfig.ts` — adicionar `investimentoPlanejado` ao tipo e ao upsert
- `src/components/planning/MediaInvestmentTab.tsx` — exibir badge e usar nova lógica
- Migração: `ALTER TABLE bu_indicators_config ADD COLUMN investimento_planejado numeric NOT NULL DEFAULT 0`
- Updates em `bu_indicators_config` e `funnel_metas` (somente data, via insert tool)

**Reversão:** restaurar via History tab ou aplicar os CSVs de backup com um INSERT … ON CONFLICT.

## Fora de escopo
- Não altera Mai-Dez nem outras BUs.
- Não mexe em `mrr_base_monthly` nem nos seeds projetados.
- Não cria sync automático com a planilha "Indicadores 26".
