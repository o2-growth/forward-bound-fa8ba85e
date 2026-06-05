## Diagnóstico: "Gap a Realocar" do Modelo Atual

Investiguei a tabela do Modelo Atual (`BUInvestmentTable` em `src/components/planning/MediaInvestmentTab.tsx`) e existem **dois indicadores diferentes** sendo confundidos:

### 1. Badge "Balanceado / desbalanceado" (rodapé fixo) — FUNCIONA
Linha 3179–3191. Mostra `pendingValidation[bu].diff`, que é `Σ(newAVender) − Σ(originalAVender)` apenas dos meses que o usuário editou. Quando você muda Jul −100k e Ago +100k, dá zero. Isso funciona como esperado.

### 2. "Gap a Realocar" dentro da tabela do Modelo Atual — NÃO FUNCIONA como o rótulo sugere
Linhas 778–880. A fórmula é:

```ts
const gap = breakdown.reduce((sum, b) => (b.gap > 0 ? sum + b.gap : sum), 0);
// b.gap = mrrBaseProjetado − mrrBase (Oxy real) apenas para meses Oxy
```

Ou seja: é a soma do déficit **passado** entre MRR projetado e MRR real (Oxy) dos meses fechados. **Esse número é fixo** — não muda quando você edita A Vender dos meses futuros.

O texto explicativo no rodapé do popover diz literalmente:
> "Realoque editando 'A Vender' de qualquer mês futuro **até zerar o saldo**."

Mas a fórmula nunca subtrai a compensação que o usuário fez nos meses futuros. Resultado: o cartão fica permanentemente vermelho mesmo depois de você ter adicionado o A Vender extra nos meses futuros.

### Causa raiz
Faltou a parte da "compensação". O saldo real deveria ser:

```
saldoRealocar = gapPassadoOxy − compensacaoFutura
compensacaoFutura = Σ(novoAVender − originalAVender) dos meses NÃO-Oxy (futuros / projeção)
```

Quando `saldoRealocar ≈ 0`, o usuário compensou todo o déficit.

---

## Plano de correção

### Mudanças em `src/components/planning/MediaInvestmentTab.tsx`

**1. Passar as edições pendentes para dentro do `BUInvestmentTable`**

Adicionar uma nova prop opcional na assinatura do componente:

```ts
pendingAVenderDiff?: number; // soma (novo − original) das edições pendentes desta BU
```

No render do Modelo Atual (~ linha 3060–3115, busca `title="Modelo Atual"`), passar:

```tsx
pendingAVenderDiff={pendingValidation.modelo_atual?.diff || 0}
```

E o mesmo para as outras BUs (o cálculo só vai mudar a UI no Modelo Atual porque é a única com `hasOxyReal`, mas a prop é genérica).

**2. Recalcular o `gap` levando a compensação em conta**

Substituir o bloco das linhas 796–797:

```ts
const gapBruto = breakdown.reduce((sum, b) => (b.gap > 0 ? sum + b.gap : sum), 0);
const compensacao = Math.max(0, pendingAVenderDiff || 0);
const gap = Math.max(0, gapBruto - compensacao);
const isResolved = gap < 1;
```

**3. Atualizar o popover de detalhamento (linhas 856–863)**

Adicionar uma linha extra no `<tfoot>` mostrando a compensação:

```
Gap bruto (Oxy − Projeção):        R$ X
Compensação A Vender (pendente):  − R$ Y
─────────────────────────────────────────
Saldo a realocar:                  R$ (X − Y)
```

E ajustar o texto auxiliar para deixar claro: edições pendentes (ainda não salvas) reduzem o saldo; depois de salvar, o gap bruto também muda porque a cadeia MRR é reconstruída.

**4. Tooltip da linha amarela "Gap a Realocar" da tabela**

Trocar `title` / texto para refletir o novo cálculo, evitando confusão entre gap bruto e saldo.

### Comportamento esperado após a correção

- Antes de qualquer edição: gap mostra o déficit puro Oxy vs projeção (mesmo de hoje).
- Usuário aumenta A Vender de Set em +R$ 200k: badge do rodapé fica "+R$ 200k" (desbalanceado), e o "Gap a Realocar" cai em R$ 200k.
- Quando a compensação iguala o gap, o cartão fica verde "✓ Tudo realocado".
- Ao salvar, as edições viram parte do plano salvo e o cálculo volta a partir do novo baseline (gap = 0 se totalmente compensado).

### Fora de escopo

- Não mexer no save (cascade-aware já implementado na mensagem anterior).
- Não mexer na lógica de `mrrBaseGap` por mês (badge laranja "Δ Oxy/Projeção" continua igual, é informativo por mês).
- Não tocar nas outras BUs além de aceitar a prop nova — só Modelo Atual tem Oxy real hoje.
