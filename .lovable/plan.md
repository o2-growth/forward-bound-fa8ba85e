# Plano — Pace Comercial

## Objetivo
Adicionar um botão **“Pace Comercial”** no cabeçalho de filtros de **Indicadores > Comercial**. Ele abrirá uma visão interna em largura total, com botão **Voltar**, preservando todos os filtros já selecionados: período, BUs, closers, SDRs e origens.

## Implementação

1. **Criar a visão Pace Comercial**
   - Criar um componente dedicado e responsivo, usando `Card`, `Button`, `Badge`, `Progress`, Recharts e somente tokens semânticos do projeto.
   - Não copiar o tema escuro isolado do HTML; manter tipografia, cores, espaçamento, estados de carregamento e componentes do design system atual.
   - Exibir no cabeçalho o período e um resumo dos filtros herdados.

2. **Reproduzir as seções do HTML com dados reais**
   - **Faturamento:** realizado, meta, percentual, pace esperado, projeção, vendas e ticket médio realizado.
   - **Oportunidades quentes:** cards ativos marcados como `Quente` no banco externo já consultado pelos indicadores, total em R$, distribuição por closer e realizado + oportunidades.
   - **Conversão do funil:** RM → RR, RR → Proposta e Proposta → Venda, calculadas a partir dos mesmos itens filtrados da visão Comercial.
   - **Ranking de closers:** faturamento e vendas por closer, com metas individuais de `closer_absolute_metas` quando cadastradas.
   - **Evolução diária do funil:** RM, RR, Proposta e Venda, com alternância entre visão diária e acumulada.

3. **Reutilizar as regras atuais de negócio**
   - Passar ao novo componente os itens e metas já calculados em `IndicatorsTab`, evitando consultas duplicadas e divergência com os cards atuais.
   - Manter reconhecimento de vendas pela data de assinatura, deduplicações, exclusão de testes, filtros por BU/pessoa/origem e valores monetários sem Educação.
   - Para informações não exibidas hoje, reutilizar os registros já trazidos do banco externo pelos hooks de analytics; não criar mocks nem nova tabela.
   - Quando uma meta individual ou temperatura não existir, mostrar estado explícito “Sem meta cadastrada” ou “Sem oportunidades quentes”, sem inventar valores.

4. **Integrar a navegação interna**
   - Inserir o botão ao lado de **Atualizar** na barra superior.
   - Alternar entre a visão Comercial atual e o Pace Comercial por estado local, sem nova rota e sem perder os filtros.
   - Adicionar botão **Voltar aos indicadores** e preservar acessibilidade de foco, rótulos e controles dos gráficos.

5. **Validar**
   - Conferir abertura, retorno e persistência de todos os filtros.
   - Validar cálculos de faturamento, ticket, conversões, ranking e séries contra os dados já mostrados nos Indicadores.
   - Testar estados com dados, sem dados e carregamento, além do layout responsivo.