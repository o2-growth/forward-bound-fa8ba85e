Plano para corrigir o popover de “Gap a Realocar”:

1. Separar “valor real vindo da Oxy” de “valor projetado por churn”
   - Hoje `mrrBaseRealPorMes` mistura os dois: quando não existe valor real no banco, ele preenche o mês futuro com projeção.
   - Isso faz `hasOxyReal` ficar verdadeiro em Mai–Dez, porque `realMrr > 0` também vale para projeções.

2. Criar um mapa explícito de presença real
   - Manter o valor projetado para os cálculos que dependem dele.
   - Adicionar um mapa/flag separado, por mês, indicando se existe registro real em `mrr_base_monthly`.
   - O badge “Oxy” usará somente essa flag real, não o valor projetado.

3. Ajustar o Modelo Atual no `MediaInvestmentTab.tsx`
   - Para meses com registro real: mostrar “Oxy” e calcular Δ = projetado − real.
   - Para meses sem registro real: mostrar “Projeção”, Δ = R$ 0, e usar a chain corrigida como exibido.

4. Validar o resultado esperado
   - Jan–Abr: “Oxy” se houver registro real.
   - Mai–Dez: “Projeção”, sem Δ a realocar.
   - O total a realocar considera apenas meses realmente fechados com dado da Oxy.