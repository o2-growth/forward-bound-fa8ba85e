

## Diagnóstico dos 3 arquivos vs sistema + correção do build error

### 1. Análise dos arquivos enviados

**Arquivo MQL (Modelo Atual ≥ R$ 200k mensal)** — `mql_acima_de_200_mil_mensal_04-20-2026.xlsx`
- **Vazio** (0 registros). O arquivo não contém linhas de dados. Preciso que você reexporte com os filtros aplicados, pois sem dados não consigo comparar com o sistema.

**Arquivo RM Franquia** — `reuniao_marcada_04-20-2026.xlsx`
- **108 cards** com fase atual ≠ "Lead/MQL" (já passaram por RM em algum momento).
- Distribuição por fase atual: Proposta enviada/Follow Up (~63), Reunião agendada/Qualificado (~22), Perdido (~12), Remarcar/No show (~6), Contrato assinado (3), Contrato em elaboração (1), Reunião Realizada (1), Enviar proposta (4), Contato Futuro (3).
- Coluna usada para datar: **"Created at"** (data de criação do card).

**Arquivo RR Franquia** — `reuniao_realizada_franquia_04-20-2026.xlsx`
- **35 cards** com fase atual ≥ Reunião Realizada.
- Datados por **"Created at"**.

### 2. Diagnóstico de divergências (provável causa)

A divergência vem do **eixo de data** usado no sistema vs no Pipefy export:

| Indicador | Pipefy export usa | Sistema usa |
|---|---|---|
| MQL Modelo Atual | "Created at" (data criação do card) | **Data de criação** ✅ (`mql-creation-date-rule`) — coerente, mas exclui motivos de perda como "Duplicado", "ICP fora", "Não é demanda" e cards de teste. Diferença esperada: sistema mostra **menos** que o export bruto. |
| RM Franquia | Filtro Pipefy = "passou pela fase Reunião agendada/Qualificado", datado pela criação do card | `useExpansaoMetas`: conta pela **data de entrada na fase RM** (`Entrada` da `pipefy_cards_movements_expansao`) com **deduplicação mensal** (1 vez por card por mês) e funil cumulativo. |
| RR Franquia | Filtro Pipefy = "passou pela Reunião Realizada", datado pela criação | `useExpansaoMetas`: conta pela **data de entrada na fase RR**, dedup mensal + cumulativo. |

**Por que dá número diferente:**
1. **Eixo temporal** — o Pipefy datou pelo "Created at" (quando o lead chegou); o sistema data por "Entrada na fase" (quando o card de fato moveu para RM/RR). Um card criado em fevereiro mas que entrou em RM em março conta em meses diferentes.
2. **Deduplicação mensal** — sistema garante 1 contagem por card/fase/mês; export do Pipefy mostra o card 1x mesmo que tenha passado várias vezes pela fase em meses distintos (sistema poderia contar mais nesse caso).
3. **Funil cumulativo Expansão** — sistema "puxa" cards em fases avançadas (ex.: Proposta) para RM/RR retroativamente se não houver registro anterior. Isso aumenta a contagem do sistema vs export bruto se o export não cobrir esses retroativos.
4. **Card de teste** — sistema exclui IDs em `isTestCard`; export inclui tudo.
5. **Liquidez MQL** — sistema desconta motivos de perda (`Duplicado`, `ICP fora`, `Não é demanda`); export bruto não.

### 3. Próximos passos do diagnóstico (precisa execução em modo padrão)

1. **Reexportar o arquivo MQL** com dados (o atual veio vazio). 
2. Rodar um script de comparação card-a-card que:
   - Carregue os 3 xlsx em /tmp.
   - Consulte o sistema (`useExpansaoMetas` + `useModeloAtualMetas`) com o mesmo período de cada arquivo.
   - Liste: (a) cards no Pipefy mas ausentes no sistema, (b) cards no sistema mas ausentes no Pipefy, (c) cards em ambos com mês diferente.
3. Gerar relatório CSV em `/mnt/documents/diagnostico_indicadores_<data>.csv` por indicador.

### 4. Bug de build a corrigir (separado, mas obrigatório)

`src/components/planning/nps/OperationsSection.tsx:63` lê `client.produto` mas a interface `CfoClient` (em `src/hooks/useOperationsData.ts:51`) **não tem o campo `produto`**. Duas opções:

- **Opção A (recomendada):** adicionar `produto: string` em `CfoClient` e popular em `useOperationsData.ts:241-246` com `produto: card['Produtos'] || ''`. Mantém o filtro funcional.
- **Opção B:** remover o filtro por produto no `OperationsSection.tsx` (perde funcionalidade).

Vou aplicar a **Opção A** (1 campo na interface + 1 linha no push).

### Resumo executivo para o usuário
- O arquivo de MQL está vazio — me reenvia por favor.
- A diferença esperada em RM/RR Franquia vem de: (1) o sistema usa data de entrada na fase, não data de criação do card; (2) dedup mensal; (3) funil cumulativo; (4) exclusão de cards de teste. Em geral o sistema deve mostrar valores **próximos mas não idênticos** ao export bruto do Pipefy filtrado por "passou pela fase".
- Vou rodar comparação card-a-card assim que aprovado e gerar CSV de divergências.
- Aproveito para corrigir o erro de build em `OperationsSection.tsx`.

