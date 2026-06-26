## Diagnóstico (testado via Playwright)

A correção anterior aplicou `sticky top-0` no `TableHeader`, e o `position: sticky` está sendo computado. Porém, ao rolar o modal "RM - Estamos Convertendo MQLs em Reuniões?" para `scrollTop=3000`, o `<thead>` sai da viewport (top=-1874) — não fica fixo.

**Causa raiz:** o componente shadcn `Table` (em `src/components/ui/table.tsx`) envolve toda `<table>` em `<div className="relative w-full overflow-auto">`. Esse `overflow-auto` cria um **novo contexto de scroll** entre o `<thead>` e o container externo do diálogo (`flex-1 overflow-y-auto`). O `position: sticky` do `<thead>` passa a ser relativo a esse wrapper interno (que não tem altura limitada e não rola), então o sticky nunca "ativa" em relação ao scroll real do modal.

## Correção

Em `src/components/planning/indicators/DetailSheet.tsx`, neutralizar o wrapper interno do shadcn Table apenas para esta tabela (sem mexer no componente global):

- Trocar `<div className="border rounded-lg">` por  
  `<div className="border rounded-lg [&>div]:overflow-visible">`  
  Isso força o `<div>` interno gerado por `<Table>` a `overflow: visible`, eliminando o contexto de scroll intermediário. O `position: sticky` do `<thead>` passa a referenciar o scroll real do `DialogContent` e o cabeçalho fica fixo ao rolar.

Não há mudança em outros locais — apenas o drill-down `DetailSheet` é afetado.

## Verificação

Reabrir o Playwright e checar:
- `getComputedStyle(thead).position === 'sticky'` ✅ (já estava)
- Após `scrollTop=3000`, `theadTop` deve igualar `scrollerTop` (cabeçalho colado no topo do modal).
- Screenshot do modal rolado deve mostrar a linha "Status / Empresa / Closer / Tempo / Faturamento / Data" visível.