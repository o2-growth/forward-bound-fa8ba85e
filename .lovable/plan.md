Plano para corrigir o Setup da Modelcraft ainda zerado:

1. Aplicar o mesmo fallback da Modelcraft também em `useModeloAtualMetas.ts`, que é o hook que aparece nos logs calculando `getValueForPeriod venda` e ainda soma Setup = 0.
2. Ajustar as duas fontes dentro desse hook:
   - movimentos do período (`query_period`)
   - movimentos por assinatura (`query_period_by_signature`)
3. Garantir que o valor total de venda passe a somar MRR + Setup + Pontual, mantendo Educação fora da receita padrão conforme regra do projeto.
4. Revisar o agregado do Marketing (`useIndicators26Live.ts`) para garantir que ele consuma os cards já corrigidos e que o setup apareça na linha “Setup” e em GMV/TCV quando aplicável.
5. Validar pelos logs/preview que a Modelcraft aparece com Setup R$ 10.800 e que o total de vendas/Fat. Incremento deixa de ficar zerado por causa desse card.