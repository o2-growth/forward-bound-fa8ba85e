## Problema

O `CardInvestigator` mostra como "fase invisível" várias fases que **na verdade são conhecidas pelo dashboard** — só que o mapa interno do Investigator está incompleto comparado aos hooks reais (`useModeloAtualAnalytics`, `useO2TaxAnalytics`, `useExpansaoAnalytics`).

Após confirmar nos hooks:

| Fase | Status real |
|---|---|
| `Ganho` | ✅ Conta como **Venda** (Expansão e O2 TAX) — falta no Investigator |
| `Enviar para assinatura` | ✅ Fase intermediária válida (O2 TAX) |
| `Em Contato` | ⚪ Existe no Pipefy mas **não conta** em nenhum indicador |
| `Enviar proposta` | ⚪ Existe no Pipefy mas **não conta** (Modelo Atual usa só "Proposta enviada / Follow Up") |
| `Contrato em elaboração` | ⚪ Fase intermediária, **não conta** |
| `Perdido` / `Arquivado` | ⚪ Terminais, **não contam** como indicador |

O Investigator trata os dois casos (não mapeada vs. intencionalmente ignorada) da mesma forma, e ainda esconde casos verdadeiros como "Ganho".

## Correção em `src/components/planning/indicators/CardInvestigator.tsx`

### 1. Adicionar `'Ganho': 'Venda'` em `MA_PHASE_TO_INDICATOR` e `EXP_PHASE_TO_INDICATOR`
Reflete o `sales-phase-universal-definition` (Ganho = venda nas BUs de Expansão e O2 TAX).

### 2. Criar `KNOWN_NON_COUNTING_PHASES` (set normalizado)
Inclui: `em contato`, `enviar proposta`, `contrato em elaboracao`, `enviar para assinatura`, `perdido`, `arquivado`. Fases conhecidas do Pipefy que intencionalmente não contam como indicador.

### 3. Refinar detecção de problemas em `buildDiagnostics`
Substituir o loop atual de `unmappedPhases` por uma lógica de 3 estados:
- **Mapeada** → conta no indicador (sem problema).
- **Conhecida não-contabilizada** → não emite problema (fase intermediária esperada).
- **Genuinamente desconhecida** → mantém warning "fase não mapeada — invisível".

### 4. Atualizar renderização da timeline
Adicionar terceiro estado visual: para fases em `KNOWN_NON_COUNTING_PHASES`, exibir em cinza neutro **sem** o `HelpCircle` amarelo e **sem** badge — deixando claro que é fase intermediária reconhecida (não erro).

## Resultado esperado

Para o card relatado:
- `Em Contato`, `Enviar proposta`, `Contrato em elaboração` → somem de "Possíveis Problemas". Aparecem na timeline em cinza neutro.
- `Ganho` → passa a contar como Venda com badge + mês.
- Apenas fases realmente desconhecidas (typos, fases novas do Pipefy) continuam gerando warning.

Sem mudanças em outros componentes ou no banco.