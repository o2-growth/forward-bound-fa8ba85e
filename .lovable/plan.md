## Regra

- **Meta de Faturamento permanece a meta original** (ex.: Jan = R$ 1.125.000). Não muda.
- **A Vender = Meta − MRR Base (Oxy)** → cobre o gap automaticamente quando o MRR real ficou abaixo do projetado.
- **MRR Base** segue mostrando a verdade Oxy (já está correto).
- **Drill-down expansível** ganha um aviso visual quando o MRR Base real ficou abaixo do projetado, com o delta.

## Resultado esperado (Modelo Atual)

| Mês | Meta | MRR Base (Oxy) | A Vender (novo) | A Vender (antes) |
|---|---:|---:|---:|---:|
| Jan | 1.125.000 | 622.469 | **502.531** | 400.000 |
| Fev | 1.237.500 | 705.268 | **532.232** | 456.000 |
| Mar | 1.387.500 | 746.847 | _locked: 579.329_ | 538.890 |
| Abr | 1.350.000 | 733.281 | **616.719** | 417.584 |
| Mai | 1.485.000 | 700.153 | **784.847** | 504.133 |
| Jun+ | … | projeção (cadeia) | Meta − MRR projetado | … |

(Mar continua usando o snapshot lockado em `funnel_metas`.)

Vendas e funil reverso (propostas, RR, RM, MQL, Leads, Investimento) recalculam automaticamente a partir do novo A Vender, usando o ticket médio e as taxas de conversão atuais — preservando coerência com o aumento de meta.

## Alterações técnicas

**Arquivo único:** `src/components/planning/MediaInvestmentTab.tsx`

### 1. Novo cálculo de `modeloAtualFunnel` (linhas ~1310–1350)

Para cada mês não lockado:
- Se houver `mrrBaseRealPorMes[month]` (Oxy):
  - `faturamentoMeta` = `metasMensaisModeloAtual[month]` (meta original, intocada)
  - `mrrBase` = valor Oxy
  - `aVender` = `max(0, faturamentoMeta − mrrBase)` ← recalcula
  - `vendas` = `ceil(aVender / ticketMedio)`, e funil reverso recalcula `propostas`, `rrs`, `rms`, `mqls`, `leads`
  - `investimento` = `vendas × cpv` (mesma fórmula atual)
  - Adicionar campos auxiliares:
    - `mrrBaseProjetado`: o `mrrBase` que o cálculo sintético produziria (já é `d.mrrBase` antes do override)
    - `mrrBaseGap`: `mrrBaseProjetado − mrrBaseReal` (positivo = MRR ficou abaixo do plano)
- Se não houver Oxy (Jun+): mantém comportamento atual (sintético via `mrrComChurn`).

Para meses lockados (Mar): mantém snapshot do `funnel_metas` exatamente como hoje, mas anexa `mrrBaseProjetado` e `mrrBaseGap` calculados a partir do `d.mrrBase` original (informativo no expandido).

### 2. Bloco expandido (linhas ~661–700)

Adicionar uma faixa nova no topo do conteúdo expandido, condicionada a `mrrBaseGap > 0`:

```
⚠️ MRR Base abaixo do projetado
MRR Projetado: R$ 725.000  |  MRR Real (Oxy): R$ 622.469  |  Δ: −R$ 102.531
A Vender ajustado de R$ 400.000 para R$ 502.531 para preservar a Meta de R$ 1.125.000.
```

Visual: card amarelo/âmbar discreto com ícone de info/warning, usando tokens semânticos do design system (`border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400`).

Se `mrrBaseGap < 0` (Oxy veio acima do plano, raro): mostra como info azul/verde, "MRR Base superou o projetado em X, A Vender reduzido."

### 3. Tipo `FunnelData`

Adicionar dois campos opcionais:
```ts
mrrBaseProjetado?: number;
mrrBaseGap?: number; // projetado − real (positivo quando Oxy ficou abaixo)
```

### 4. Não alterar

- `usePlanGrowthData.ts` (não é renderizado nessa aba; já refletirá pois A Vender vem de `faturamentoVender`).
- `funnel_metas` no DB (Mar continua intocado).
- Lógica de pendingChanges, redistribution, save (todas operam sobre `faturamentoVender` já recalculado).
- Coluna Meta exibida — continua sendo `data.faturamentoMeta` original.

## Validação

Após implementar:
1. Jan: Meta=1.125.000, MRR Base=622.469, A Vender=502.531 (soma bate com Meta)
2. Expandir Jan: aviso âmbar mostra "MRR Real ficou R$ 102.531 abaixo do projetado"
3. Fev: A Vender ≈ 532.232 (soma bate)
4. Mar: continua locked (579.329) e expandido mostra info do gap
5. Total anual (Meta) mantém R$ 23.625.000 (= soma trimestral antiga)
