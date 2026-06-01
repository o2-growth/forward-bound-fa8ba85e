## Problema

A aba **Insights Comerciais** já está implementada e registrada como `defaultValue="insights"` em `AnalyticsSection.tsx`, mas a seção "Análises Detalhadas" que a contém é um `Collapsible` que inicia **fechado** (`useState(false)`). Por isso o usuário não vê nada ao abrir o dashboard.

## Mudança

Arquivo: `src/components/planning/indicators/AnalyticsSection.tsx`

- Trocar `useState(false)` → `useState(true)` para a seção abrir por padrão.
- Resultado: ao entrar na aba Comercial (Modelo Atual, O2 TAX, Expansão, etc.), o bloco "Análises Detalhadas" já aparece expandido e a aba **Insights** é exibida como conteúdo inicial.

## Validação

- Abrir preview em `/` → aba Comercial → conferir que a seção "Análises Detalhadas" está aberta e mostrando os cards de insights (Críticos / Atenção / No verde).
- Se nenhum insight estiver presente, mostra o estado vazio "Nenhum insight crítico no período".
- Outras tabs (Pipeline, Conversões, Perdas, Segmentação) continuam acessíveis via clique.

## Fora do escopo (próximos passos sugeridos)

- Integração IA com `ai-chat` para "provável causa" nos críticos
- Implementar regras restantes (R2–R4, R7–R8, R10–R11, R13–R15)
- Snapshots em `commercial_insights_snapshots`
