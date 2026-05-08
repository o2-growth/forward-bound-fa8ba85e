Plano para ajustar o diagnóstico Cliente 360:

1. Reforçar o bloco de sinais de risco
- Manter o sinal de risco com severidade [P0]/[P1]/[P2] e evidência rastreável.
- Exigir que cada risco explique também o impacto provável no negócio/operação, por exemplo: risco de churn, atraso de onboarding, queda de adoção, perda de receita, escalonamento operacional ou insatisfação recorrente.
- Formato proposto para cada bullet: `[P1] <sinal identificado> → pode causar <impacto provável>. (evidência: <data/ID>)`.

2. Corrigir o bloco “Movimentos sugeridos”
- Proibir o bloco de ficar vazio quando houver qualquer risco P0/P1/P2.
- Para cada risco relevante, gerar pelo menos uma ação correspondente.
- Cada ação deve ter: verbo no infinitivo + objeto claro + dono sugerido + prazo quando status for amarelo ou vermelho.
- Formato proposto: `- <Verbo> <ação concreta> — dono: <CS/CFO/Operação/Head CS>; prazo: <24h/3d/7d>; conectado ao risco <P0/P1/P2>`.

3. Ajustar regra de priorização
- Se houver risco P0: obrigar ação de escalonamento em até 24h.
- Se houver risco P1: obrigar ação em até 3 a 7 dias.
- Se houver apenas P2: sugerir ação preventiva ou monitoramento explícito.
- Se não houver risco e status for verde: manter exatamente `Manter cadência atual. Sem ações requeridas.`.

4. Validar com clientes reais
- Rodar novamente a função em 5 clientes, incluindo casos com risco amarelo/vermelho.
- Conferir se nenhum caso com risco retorna “Movimentos sugeridos” vazio.
- Conferir se cada risco tem impacto e pelo menos uma sugestão conectada.

Arquivos previstos:
- `supabase/functions/analyze-cliente-360/index.ts`: atualizar somente o `SYSTEM_PROMPT`.

Fora de escopo:
- Alterar a estrutura do JSON `get_cliente_360`.
- Alterar UI ou banco de dados.