UPDATE auth.users 
SET encrypted_password = crypt('Alterar@01', gen_salt('bf')), 
    updated_at = now() 
WHERE id = '3f9ee57c-f5e2-448b-9ffc-a9ac56a53cd6';

-- Remove admin role
DELETE FROM public.user_roles 
WHERE user_id = '3f9ee57c-f5e2-448b-9ffc-a9ac56a53cd6' 
  AND role = 'admin';

-- Garantir role 'user'
INSERT INTO public.user_roles (user_id, role)
VALUES ('3f9ee57c-f5e2-448b-9ffc-a9ac56a53cd6', 'user')
ON CONFLICT DO NOTHING;

-- Conceder todas as abas exceto admin
INSERT INTO public.user_tab_permissions (user_id, tab_key)
SELECT '3f9ee57c-f5e2-448b-9ffc-a9ac56a53cd6', tk
FROM (VALUES ('context'),('goals'),('monthly'),('media'),('marketing'),('structure'),('indicators'),('marketing_indicators'),('nps'),('financial'),('jornada'),('cs'),('sales')) AS t(tk)
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_tab_permissions 
  WHERE user_id = '3f9ee57c-f5e2-448b-9ffc-a9ac56a53cd6' AND tab_key = t.tk
);