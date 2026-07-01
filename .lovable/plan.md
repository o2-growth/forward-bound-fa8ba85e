## Ativar Análises por IA no Visão CEO

Hoje cada seção do CEO (`ComercialSection`, `DreSection`, `CaixaSection`, `FinanceiroSection`, `PessoalSection`) já tem 8 slots `<AiNote />` prontos, mas sem `onGenerate` — aparecem como "Em breve". Vou plugar Gemini nesses botões.

### 1. Edge Function `analyze-ceo-metric`
Nova função em `supabase/functions/analyze-ceo-metric/index.ts`:
- Recebe `{ section, title, context }` onde `context` é um objeto com os números-chave já calculados na seção (realizado, meta, atingimento, pace, comparativos, top-linhas).
- Chama Lovable AI Gateway (`google/gemini-3-flash-preview`) via `LOVABLE_API_KEY` — mesmo padrão das funções `ai-chat` / `analyze-churn-tratativa` já existentes.
- System prompt "mindset de CEO/gestão de negócios": análise curta (3–5 bullets), sempre em PT-BR, foco em causa-raiz, risco e próxima ação — sem repetir os números crus.
- Trata 429 (rate limit) e 402 (créditos) devolvendo mensagem clara. CORS liberado.

### 2. Hook `useCeoAiAnalysis`
`src/components/planning/ceo/useCeoAiAnalysis.ts`:
- `const { text, loading, generate } = useCeoAiAnalysis(section, title, contextBuilder)`
- `generate()` chama a edge function via `supabase.functions.invoke`, cacheia por hash do contexto em `useRef` (evita gastar crédito re-clicando com os mesmos números).
- Toast de erro em falhas.

### 3. Plugar em cada seção
Substituir os 8 `<AiNote />` pelos hooks correspondentes, cada um recebendo apenas os dados que já existem na `useMemo` da própria seção (sem recomputar nada):

| Seção | Slot | Contexto passado |
|---|---|---|
| Comercial | Overview histórico | tabela `overview.cols` (mql/rm/rr/proposta/venda por janela) |
| Comercial | Pipe negociação | pipe.total, quente/morno/frio, top closers/canais |
| Comercial | Funil realizado x meta | `funil.byStage` |
| Comercial | Pace faturamento | `pace` (metaFat, realizadoFat, expected, atingimentos) |
| DRE | tabela DRE do período | totais receita, custo, margem por grupo |
| Caixa | saldo/entrada/saída projetada | linha de caixa do período |
| Financeiro | KPIs financeiros | cards já renderizados |
| Pessoal | headcount/custo por área | cards já renderizados |

### 4. UX
- Botão vira "Gerar análise" (já é o texto quando `onGenerate` existe).
- Enquanto `loading`, spinner (já implementado no `AiNote`).
- Resposta renderizada dentro do próprio `AiNote` via prop `text`.

### Detalhes técnicos
- Modelo: `google/gemini-3-flash-preview` (default do gateway — rápido e barato para bullets curtos).
- Sem streaming: `generateText` é suficiente para 3–5 bullets; simplifica o front.
- `LOVABLE_API_KEY` já está nos secrets — não preciso pedir nada.
- `GEMINI_API_KEY` existente fica intocado (não é usado; gateway já roteia Gemini).