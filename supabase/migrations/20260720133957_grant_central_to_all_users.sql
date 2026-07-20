-- Grant 'central' tab (Central de Reuniões) to everyone that already has ANY
-- tab permission today. Admins já ganham automaticamente via allAdminTabs no código.
--
-- Regra: apenas ADITIVO. ON CONFLICT DO NOTHING garante que nada existente é
-- alterado. Nenhum DELETE/UPDATE. Seguro re-executar.
INSERT INTO public.user_tab_permissions (user_id, tab_key)
SELECT DISTINCT user_id, 'central'
FROM public.user_tab_permissions
ON CONFLICT DO NOTHING;
