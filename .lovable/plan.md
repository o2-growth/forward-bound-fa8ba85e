## Problema

No screenshot, o painel "Análise IA" está saindo da tela: o texto da "Situação atual" é cortado à direita e o JSON cru aparece imenso, esticando o drawer inteiro além do `sm:max-w-2xl`.

**Causa raiz:** dentro do `ScrollArea`, o `<pre>` do JSON de debug tem linhas muito longas (URLs, strings) sem quebra. Como o filho não tem `min-w-0`, ele força o container flex pai a crescer, "estourando" a largura do `SheetContent` e empurrando o conteúdo (incluindo o resumo da IA) para fora da viewport visível.

## Correção (somente CSS no `Cliente360Drawer.tsx`)

1. **Linha 53 — `SheetContent`**: trocar largura para algo previsível e não-elástico:
   - `w-full sm:max-w-2xl` → `w-full sm:w-[640px] sm:max-w-[90vw]`
   - manter `overflow-hidden flex flex-col p-0`

2. **Linha 74 — `ScrollArea`**: adicionar `w-full min-w-0` para travar a largura ao pai.

3. **Linha 75 — wrapper interno**: `space-y-4` → `space-y-4 min-w-0` (impede que filhos largos estiquem o flex).

4. **Linha 121 — bloco da análise**: adicionar `break-words` para quebrar palavras longas no resumo da IA.

5. **Linha 131 — `<pre>` do JSON**: trocar `overflow-auto` por `overflow-x-auto whitespace-pre` e adicionar `max-w-full` para que o scroll horizontal fique **dentro** do `<pre>`, e não no drawer inteiro.

6. **Linha 127 — `<details>`**: adicionar `min-w-0 overflow-hidden` para isolar o `<pre>` largo do restante.

## Resultado esperado

- Drawer fica fixo em ~640px (ou 90vw em telas pequenas).
- Resumo da IA quebra linha normalmente e fica totalmente visível.
- JSON debug ganha scroll horizontal próprio, sem afetar o resto.

Nenhuma mudança em lógica, hook, edge function ou backend.