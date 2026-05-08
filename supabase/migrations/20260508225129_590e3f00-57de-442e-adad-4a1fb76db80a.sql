UPDATE public.funnel_metas
SET faturamento_vender = 400000,
    vendas = 24,
    updated_at = now()
WHERE bu = 'modelo_atual' AND month = 'Mai' AND year = 2026;