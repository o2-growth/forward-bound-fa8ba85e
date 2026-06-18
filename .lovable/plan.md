## Pessoas — expansão para visão de gestão

Hoje a aba cobre o "mínimo" da spec 3.1/3.2 (KPIs + breakdowns simples). Vou adicionar **4 blocos** novos cobrindo os 4 focos aprovados, sem alterar nada do que já está rodando.

---

### Bloco 1 — Evolução temporal (12m)

**Card "Headcount e movimentação — últimos 12 meses"**
- Gráfico combinado (Recharts `ComposedChart`):
  - **Linha**: headcount ativo no fim do mês (reconstruído a partir de `Data de contratação` e `updated_at` dos inativos)
  - **Barras verdes**: admissões do mês
  - **Barras vermelhas**: desligamentos do mês
- Tooltip mostrando net change (+/-) e turnover% do mês.

**Card "Custo de pessoal por BU — 12 meses" (stacked area)**
- Usa `cat.serie` que já vem do `usePersonnelCostByBu` (hoje só agregamos o total do período).
- Empilha CaaS / SaaS / TAX / Expansão / CS / Education / Corporativo mês a mês.
- Linha de referência: receita mensal (eixo secundário) → permite ver a tendência de custo/receita.

**Chips Δ% nos 5 KPIs de 3.2**
- Cada KPI ganha um sub-texto "vs mês anterior: +3,2%" (verde/vermelho conforme direção).
- Hook auxiliar `useHrData` e `usePersonnelCostByBu` são chamados 2x (período atual + período anterior do mesmo tamanho) com `useMemo`.

---

### Bloco 2 — Composição do time

**Card "Tempo de casa — distribuição"**
- Buckets: `<6m`, `6–12m`, `1–2a`, `2–3a`, `3–5a`, `>5a`.
- Barras horizontais com contagem + % do total.
- Insight automático: se >30% está em `<6m`, banner amarelo "alta proporção de calouros — risco de turnover precoce".

**Card "Pirâmide de senioridade"**
- Classifica `Cargo` por regex: `/estagi/`, `/junior|jr\b/`, `/pleno/`, `/senior|sr\b/`, `/lead|head|coordena|gerente|diretor/`, `/c-?level|cfo|cto|ceo|cmo/`.
- Pirâmide invertida (barras horizontais empilhadas top→down).
- Mostra % por nível.

**Mini-card "Aniversariantes de casa este mês"**
- Lista até 10 nomes que completam ano-redondo (1, 2, 3, 5 ou 10 anos) no mês selecionado.
- Mostra: nome, cargo, "completou X anos em DD/MM".

---

### Bloco 3 — Eficiência / produtividade

**Tabela "Eficiência por BU"** (substitui o atual "Custo médio por pessoa" expandindo-o)
| BU | Headcount | Receita (período) | Custo pessoal | Receita/pessoa | Custo/pessoa | Margem por pessoa | Custo/Receita |
- Receita por BU vem de `oxy.dreByBU` (já temos).
- Custo por BU vem de `pc.porBu` (já temos).
- Ordenado por margem/pessoa.
- Linhas coloridas: verde se margem/pessoa > 50% do top, vermelho se margem negativa.

**Mini-gráfico de barras "Receita/pessoa por BU"** ao lado da tabela (rápido scanning visual).

---

### Bloco 4 — Operacional / drill-down + alertas

**Banner de alertas no topo da aba** (acima de 3.1)
- Gera lista dinâmica:
  - Turnover geral > 5% no período → alerta vermelho com link "ver por área"
  - Custo/Receita > 60% → alerta vermelho
  - Área com >2 desligamentos no mês → alerta amarelo com nome da área
  - Tempo médio de casa < 12 meses → alerta amarelo
  - Sem desligamentos no período → chip verde "saúde ok"

**Drill-down por pessoa nos cards de Headcount por Time / Área**
- Click no nome do Time/Área abre `Sheet` lateral (já existe `ui/sheet`).
- Mostra tabela: Nome · Cargo · Data de contratação · Tempo de casa · E-mail O2 · Situação.
- Ordenado por tempo de casa desc.
- Permite copiar lista (botão "Copiar e-mails do time").

**Card "Top 5 pessoas com mais tempo de casa"** + **"Top 5 mais recentes"** lado a lado — útil para reconhecimento e onboarding.

---

### Detalhes técnicos

- Não há mudança no schema — tudo se calcula a partir de `pipefy_db_pessoas` (já carregado em `useHrData.rawPessoas`) e da DRE Oxy (já carregada em `usePersonnelCostByBu`).
- Histórico 12m de headcount é **reconstruído**: para cada mês M, `headcount(M) = ativos hoje + desligados após M − admitidos após M`. É aproximado mas consistente com o que já temos.
- Período anterior para Δ% = mesmo tamanho do range atual, deslocado para trás.
- Pirâmide de senioridade e buckets de tenure são puro client-side.
- Drill-down usa `Sheet` do shadcn já presente, sem nova dependência.

### Fora do escopo
- Salário individual / faixa salarial (Pipefy não expõe).
- Pessoas planejadas vs preenchidas (sem fonte de plano de contratação).
- Indicadores Fase 2 do PDF.
