# Refino da Análise IA — Cliente 360

## Diagnóstico (resumo)

A saída atual para "We do Brazil" mostra 3 problemas estruturais que se repetem em qualquer cliente saudável:

1. **Modelo "alucina risco para preencher bloco".** Cliente com NPS 9 🟢, setup ok, rotinas verdes saiu com 4 movimentos sugeridos — porque o prompt obriga 3 blocos preenchidos e o modelo evita escrever "Sem sinais relevantes".
2. **Mistura contexto histórico com risco vivo.** Mudanças de CFO já resolvidas, 1 reunião perdida com follow-up via WhatsApp e 1 comitê remarcado por agenda dos sócios viraram "risco" — não são.
3. **Movimentos genéricos e desproporcionais ao status.** "Agendar reunião para entender impacto" em cliente promotor é overkill e ruído operacional.

Falta também um **veredito de uma linha** no topo (🟢/🟡/🔴 + frase) — hoje o head precisa ler tudo para saber se o cliente está bem.

**Conclusão: precisa melhorar.** Mas o problema é **só prompt** — os dados vindos do `get_cliente_360` são suficientes (a saída cita fase, datas, NPS, IDs de reuniões, feedback). Não é necessário enriquecer JSON nem mexer no frontend.

## O que vai mudar

Apenas o `SYSTEM_PROMPT` em `supabase/functions/analyze-cliente-360/index.ts`. Mais nada.

### Novo formato de saída

```
**Status:** 🟢 Saudável | 🟡 Atenção | 🔴 Crítico — <frase única de veredito (≤20 palavras)>

**Situação atual**
- Fase, tempo na fase, produto, CFO responsável
- Setup: status + data de conclusão (se houver)
- NPS: nota mais recente + tendência (se houver histórico)
- Rotinas: cadência atual + última interação
- Tratativas em aberto: quantidade

**Sinais de risco**
Bullets, cada um marcado [P0]/[P1]/[P2]. Se nada qualificar, escrever exatamente: "Sem sinais relevantes."

**Movimentos sugeridos**
Bullets acionáveis (verbo no infinitivo + objeto + dono sugerido quando óbvio). Máx 3.
Se status = 🟢 Saudável e nenhum risco P0/P1, escrever: "Manter cadência atual. Sem ações requeridas."
```

### Critérios objetivos (vão entrar no prompt)

**Status do cliente:**
- 🔴 Crítico: NPS ≤6 recente, OU tratativa P0 aberta, OU churn em curso, OU setup atrasado >90d, OU rotinas vermelhas reiteradas.
- 🟡 Atenção: NPS 7-8 com queda vs anterior, OU 1 tratativa aberta, OU rotina amarela, OU setup atrasado 30-90d, OU >45d sem interação.
- 🟢 Saudável: NPS ≥9, sem tratativa aberta, rotinas verdes, setup ok.

**O que NÃO é risco (proibições explícitas):**
- Eventos pontuais já resolvidos (1 reunião perdida com follow-up registrado, 1 remarcação por agenda).
- Histórico de mudanças de equipe quando a equipe atual está estável.
- Feedback positivo com ressalva quando a nota é ≥9.
- Qualquer ruído operacional sem padrão repetitivo (≥2 ocorrências em 90 dias).

**Calibração de tom por status:**
- 🟢 → factual e seco. Evitar dramatizar. Bloco de risco normalmente vazio.
- 🟡 → apontar o risco com data/evidência. 1-2 movimentos.
- 🔴 → urgência + dono + prazo sugerido.

**Regras gerais reforçadas:**
- Usar somente o JSON. Não inventar.
- Citar IDs/datas/nomes do JSON em cada afirmação.
- Movimentos sempre acionáveis: começar com verbo (Agendar, Revisar, Escalar, Confirmar, Documentar). Proibir verbos vagos: "reforçar comunicação", "investigar genericamente", "alinhar expectativas".
- Limite duro: 200 palavras totais.

### Exemplo de saída esperada para "We do Brazil"

```
**Status:** 🟢 Saudável — Em Operação Recorrente desde jan/2026, NPS 9 com CFO estável (Everton).

**Situação atual**
- Fase: Em Operação Recorrente há ~4 meses (desde 2026-01-11). Produto: CFOaaS.
- Setup concluído. CFO responsável: Everton Bisinella.
- NPS mais recente (2026-04-06): 9 🟢. Feedback positivo com ressalva sobre tempo até maturidade da operação.
- Rotinas ativas, temperaturas 🟢. Sem tratativas em aberto.

**Sinais de risco**
Sem sinais relevantes.

**Movimentos sugeridos**
Manter cadência atual. Sem ações requeridas.
```

Compare com a saída atual (4 movimentos forçados em cima de um cliente promotor) — fica óbvia a diferença.

## Arquivos afetados

- `supabase/functions/analyze-cliente-360/index.ts` — substituir constante `SYSTEM_PROMPT`. Nenhuma outra mudança (lógica de fetch, Gemini config, error handling permanecem). Redeploy automático.

## Fora de escopo

- Não mexer no `get_cliente_360` (dados já bastam).
- Não mexer no `Cliente360Drawer.tsx` (formato visual do drawer já comporta os blocos novos).
- Não mexer em cache/regenerar (já existe).

## Como validar

Após deploy, clicar "Regenerar" em 3 perfis distintos:
1. We do Brazil (esperado: 🟢, sem ações).
2. Um cliente com NPS ≤7 ou tratativa aberta (esperado: 🟡 ou 🔴 com risco datado).
3. Um cliente em onboarding (esperado: 🟢 ou 🟡 dependendo de prazo de setup).