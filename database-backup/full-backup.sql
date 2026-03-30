-- ============================================
-- FULL BACKUP SQL - Banco de Dados Completo
-- Projeto: Planning 2026 - O2 Inc
-- Data de Exportação: 2026-03-16
-- Supabase Project ID: dgwmwmofyaxstykwuzxh
-- ============================================

-- IMPORTANTE:
-- 1. auth.users NÃO está incluído (gerenciado pelo Supabase Auth)
-- 2. Os usuários precisam ser recriados no novo projeto ANTES de rodar este seed
-- 3. Os UUIDs dos profiles devem corresponder aos UUIDs do auth.users
-- 4. meta_ads_cache foi omitido (cache temporário)

-- ============================================
-- SCHEMA: Enum Types
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- SCHEMA: Tables
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_tab_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tab_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.monetary_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu TEXT NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT 2026,
  vendas INTEGER NOT NULL DEFAULT 0,
  ticket_medio NUMERIC NOT NULL DEFAULT 0,
  faturamento NUMERIC DEFAULT 0,
  mrr NUMERIC DEFAULT 0,
  setup NUMERIC DEFAULT 0,
  pontual NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.closer_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu TEXT NOT NULL,
  month TEXT NOT NULL,
  closer TEXT NOT NULL,
  percentage NUMERIC NOT NULL DEFAULT 50,
  year INTEGER NOT NULL DEFAULT 2026,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_realized (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu TEXT NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT 2026,
  value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mrr_base_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  is_total_override BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.funnel_realized (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu TEXT NOT NULL,
  month TEXT NOT NULL,
  indicator TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT 2026,
  value INTEGER NOT NULL DEFAULT 0,
  date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  total_inflows NUMERIC NOT NULL DEFAULT 0,
  customer_count INTEGER NOT NULL DEFAULT 0,
  year INTEGER NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cost_stage_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT 2026,
  cpl NUMERIC NOT NULL DEFAULT 0,
  cpmql NUMERIC NOT NULL DEFAULT 0,
  cpp NUMERIC NOT NULL DEFAULT 0,
  cprm NUMERIC NOT NULL DEFAULT 0,
  cprr NUMERIC NOT NULL DEFAULT 0,
  cpv NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meta_ads_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_sales_realized_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGER: handle_new_user on auth.users
-- ============================================
-- NOTA: Este trigger deve ser criado manualmente no novo projeto:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RLS: Enable Row Level Security
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tab_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetary_metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closer_metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_realized ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mrr_base_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_realized ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_stage_metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_cache ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: profiles
-- ============================================

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============================================
-- RLS POLICIES: user_roles
-- ============================================

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- RLS POLICIES: user_tab_permissions
-- ============================================

CREATE POLICY "Users can view their own permissions" ON public.user_tab_permissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all permissions" ON public.user_tab_permissions
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert permissions" ON public.user_tab_permissions
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete permissions" ON public.user_tab_permissions
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- RLS POLICIES: monetary_metas
-- ============================================

CREATE POLICY "Authenticated users can read monetary metas" ON public.monetary_metas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert monetary metas" ON public.monetary_metas
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update monetary metas" ON public.monetary_metas
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete monetary metas" ON public.monetary_metas
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- RLS POLICIES: closer_metas
-- ============================================

CREATE POLICY "Authenticated users can read closer metas" ON public.closer_metas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert closer metas" ON public.closer_metas
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update closer metas" ON public.closer_metas
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete closer metas" ON public.closer_metas
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- RLS POLICIES: sales_realized
-- ============================================

CREATE POLICY "Authenticated users can read sales data" ON public.sales_realized
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sales data" ON public.sales_realized
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can update sales data" ON public.sales_realized
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete sales data" ON public.sales_realized
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- RLS POLICIES: mrr_base_monthly
-- ============================================

CREATE POLICY "Authenticated users can read mrr_base" ON public.mrr_base_monthly
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert mrr_base" ON public.mrr_base_monthly
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update mrr_base" ON public.mrr_base_monthly
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete mrr_base" ON public.mrr_base_monthly
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- RLS POLICIES: funnel_realized
-- ============================================

CREATE POLICY "Authenticated users can read funnel data" ON public.funnel_realized
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert funnel data" ON public.funnel_realized
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update funnel data" ON public.funnel_realized
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete funnel data" ON public.funnel_realized
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- RLS POLICIES: daily_revenue
-- ============================================

CREATE POLICY "Authenticated users can read daily_revenue" ON public.daily_revenue
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage daily_revenue" ON public.daily_revenue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- RLS POLICIES: cost_stage_metas
-- ============================================

CREATE POLICY "Authenticated users can read cost stage metas" ON public.cost_stage_metas
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert cost stage metas" ON public.cost_stage_metas
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update cost stage metas" ON public.cost_stage_metas
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete cost stage metas" ON public.cost_stage_metas
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- RLS POLICIES: admin_audit_logs
-- ============================================

CREATE POLICY "Admins can read audit logs" ON public.admin_audit_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================
-- RLS POLICIES: meta_ads_cache
-- ============================================

CREATE POLICY "Authenticated users can read cache" ON public.meta_ads_cache
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage cache" ON public.meta_ads_cache
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- REALTIME (se necessário)
-- ============================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.funnel_realized;

-- ============================================
-- DATA: profiles (11 registros)
-- ============================================
-- NOTA: Os UUIDs devem corresponder aos auth.users do novo projeto.
-- Se os UUIDs forem diferentes, atualize-os abaixo.

INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
VALUES
  ('8f658b59-e72e-41d6-8cbc-c5788bbeb01a', 'daniel.trindade@o2inc.com.br', 'Daniel Trindade', '2026-01-02T16:57:17.702648+00', '2026-01-02T17:41:07.302453+00'),
  ('463c44b8-b03d-4822-bc0d-4ea003a89d98', 'pedro.albite@o2inc.com.br', 'Pedro Albite', '2026-01-02T17:22:25.415759+00', '2026-03-07T20:33:16.333512+00'),
  ('15931339-b5f1-4790-83f0-640f19d7fba3', 'lucas.ilha@o2inc.com.br', 'Lucas Ilha', '2026-01-02T20:00:45.489778+00', '2026-01-02T20:00:45.489778+00'),
  ('cc1945c8-29dd-4fc5-bf28-32abcbec91dc', 'andreylopes.ia@gmail.com', 'Andrey Lopes', '2026-01-03T18:35:02.283302+00', '2026-01-03T18:35:02.283302+00'),
  ('414af294-e8f3-4741-a88e-f83f1e954b9e', 'rafael.fleck@o2inc.com.br', 'Rafael Fleck', '2026-01-05T13:46:58.605351+00', '2026-01-05T13:46:58.605351+00'),
  ('8d6f4099-1632-435b-a12b-85048ed48c8a', 'jv241004@gmail.com', 'João Victor', '2026-01-10T21:02:14.102102+00', '2026-01-10T21:02:14.199691+00'),
  ('a4309402-5fc2-433e-89e3-de72a8a27aec', 'eduarda.rovani@o2inc.com.br', 'Eduarda Rovani', '2026-01-16T19:46:35.971888+00', '2026-01-26T11:13:17.592849+00'),
  ('0d0fe9de-fed3-4b3d-b900-6b9fe22e5a2a', 'carlos.ramos@o2inc.com.br', 'Carlos Ramos', '2026-01-26T18:26:28.430805+00', '2026-01-26T18:27:28.092055+00'),
  ('e291dc36-debd-429a-b55d-371f5a5b43d1', 'amanda.serafim@o2inc.com.br', NULL, '2026-01-27T18:01:49.485283+00', '2026-01-27T18:01:49.485283+00'),
  ('12869fab-b2a9-4fdd-893a-29767d4113bd', 'carolina.boeira@o2inc.com.br', 'Carolina Boeira', '2026-01-31T17:45:33.83218+00', '2026-01-31T17:45:33.83218+00'),
  ('b217396d-b250-41ea-aa10-2523b9d1d020', 'marco.azevedo@o2inc.com.br', 'Marco Aurélio Azevedo', '2026-02-12T19:28:13.801608+00', '2026-02-12T19:28:13.801608+00')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();

-- ============================================
-- DATA: user_roles (11 registros)
-- ============================================

INSERT INTO public.user_roles (id, user_id, role, created_at)
VALUES
  ('0a792b94-cb0c-407b-8139-77ec1d08bac9', '8f658b59-e72e-41d6-8cbc-c5788bbeb01a', 'admin', '2026-01-02T16:57:17.702648+00'),
  ('d5427c58-83c5-4d5a-bb99-47b4fd5e86b6', '463c44b8-b03d-4822-bc0d-4ea003a89d98', 'admin', '2026-01-02T17:23:17.923397+00'),
  ('43d8c71a-e533-4b19-9683-653033635325', '414af294-e8f3-4741-a88e-f83f1e954b9e', 'admin', '2026-01-05T13:47:05.338188+00'),
  ('f9b03f04-8d5c-4005-a4c6-e81135bb6975', '8d6f4099-1632-435b-a12b-85048ed48c8a', 'admin', '2026-01-10T21:02:14.259087+00'),
  ('f0b213c9-01f4-42ce-866e-30f39e4f04dd', 'a4309402-5fc2-433e-89e3-de72a8a27aec', 'admin', '2026-01-16T19:46:35.971888+00'),
  ('861c11f6-8ec8-452a-a252-df923e14f5b5', '15931339-b5f1-4790-83f0-640f19d7fba3', 'admin', '2026-01-26T11:12:51.880152+00'),
  ('7eb59890-d807-4fda-b4fc-323088285cca', 'cc1945c8-29dd-4fc5-bf28-32abcbec91dc', 'admin', '2026-01-26T11:13:02.400572+00'),
  ('e5cc2fa4-b85e-40b5-90c5-95634f53e171', '0d0fe9de-fed3-4b3d-b900-6b9fe22e5a2a', 'admin', '2026-01-26T18:26:28.430805+00'),
  ('f574ab9a-0491-498e-849b-b33daacbdc37', 'e291dc36-debd-429a-b55d-371f5a5b43d1', 'admin', '2026-02-12T14:33:31.786172+00'),
  ('af449eab-0281-4f28-b2fc-d6883b87f53a', '12869fab-b2a9-4fdd-893a-29767d4113bd', 'admin', '2026-02-12T14:33:33.098913+00'),
  ('1bbc28f4-ff2a-470c-8a2d-79836e347f26', 'b217396d-b250-41ea-aa10-2523b9d1d020', 'user', '2026-02-12T19:28:13.801608+00')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

-- ============================================
-- DATA: user_tab_permissions (56 registros)
-- ============================================

INSERT INTO public.user_tab_permissions (id, user_id, tab_key, created_at)
VALUES
  -- Carolina Boeira (carolina.boeira@o2inc.com.br)
  ('c246e13a-cd48-4dc0-9d2a-658a437a6ae8', '12869fab-b2a9-4fdd-893a-29767d4113bd', 'context', '2026-02-12T12:57:44.694652+00'),
  ('daae7622-aae1-4002-b6d6-bcf59d59b1cd', '12869fab-b2a9-4fdd-893a-29767d4113bd', 'goals', '2026-02-12T12:57:44.694652+00'),
  ('2b829f85-8ab7-44d6-8b8f-7a0410d33992', '12869fab-b2a9-4fdd-893a-29767d4113bd', 'marketing', '2026-02-12T12:57:44.694652+00'),
  ('157ff312-1403-4261-81fe-f67e128243c3', '12869fab-b2a9-4fdd-893a-29767d4113bd', 'media', '2026-02-12T12:57:44.694652+00'),
  ('9548cff7-10fc-471f-848f-03fa90a984c7', '12869fab-b2a9-4fdd-893a-29767d4113bd', 'monthly', '2026-02-12T12:57:44.694652+00'),
  ('cf25f025-2ef9-4140-b0b4-b9ecd36aef57', '12869fab-b2a9-4fdd-893a-29767d4113bd', 'sales', '2026-02-12T12:57:44.694652+00'),
  ('63412192-2db2-49b2-a661-12d0cc68623e', '12869fab-b2a9-4fdd-893a-29767d4113bd', 'structure', '2026-02-12T12:57:44.694652+00'),
  -- Lucas Ilha (lucas.ilha@o2inc.com.br)
  ('07f4f04b-f736-4f63-95f3-a20859e7c23a', '15931339-b5f1-4790-83f0-640f19d7fba3', 'goals', '2026-01-26T11:12:45.646395+00'),
  ('b357ce8f-d9a3-41fb-bf1d-a4da1e965257', '15931339-b5f1-4790-83f0-640f19d7fba3', 'media', '2026-01-26T11:12:45.646395+00'),
  ('a27d3a23-e6f0-43ac-b046-7d9c62634305', '15931339-b5f1-4790-83f0-640f19d7fba3', 'sales', '2026-01-26T11:12:45.646395+00'),
  -- Rafael Fleck (rafael.fleck@o2inc.com.br)
  ('a8df766d-2966-4b04-a4da-718be7f0e929', '414af294-e8f3-4741-a88e-f83f1e954b9e', 'context', '2026-01-05T13:46:58.923474+00'),
  ('f4715556-280b-4445-bb07-6ef56bf14ea8', '414af294-e8f3-4741-a88e-f83f1e954b9e', 'goals', '2026-01-05T13:46:58.923474+00'),
  ('56e3e8ad-1807-415b-864e-516145ade181', '414af294-e8f3-4741-a88e-f83f1e954b9e', 'marketing', '2026-01-05T13:46:58.923474+00'),
  ('c9d292b7-7be7-4818-9399-d7eb9cbe004d', '414af294-e8f3-4741-a88e-f83f1e954b9e', 'media', '2026-01-05T13:46:58.923474+00'),
  ('1a84111a-0262-4904-bb51-81b2a9ad4bd5', '414af294-e8f3-4741-a88e-f83f1e954b9e', 'monthly', '2026-01-05T13:46:58.923474+00'),
  ('e7185c22-12ed-4993-9612-b09a2b29157a', '414af294-e8f3-4741-a88e-f83f1e954b9e', 'sales', '2026-01-05T13:46:58.923474+00'),
  ('42e08163-4a04-410a-863e-1e483820c80a', '414af294-e8f3-4741-a88e-f83f1e954b9e', 'structure', '2026-01-05T13:46:58.923474+00'),
  -- João Victor (jv241004@gmail.com)
  ('ed8ca384-e6e2-46d1-be41-cbf53cb1001b', '8d6f4099-1632-435b-a12b-85048ed48c8a', 'admin', '2026-01-10T21:02:14.583492+00'),
  ('78705cc1-8692-438f-bb35-2e036c7f2519', '8d6f4099-1632-435b-a12b-85048ed48c8a', 'context', '2026-01-10T21:02:14.313014+00'),
  ('90812e8f-9839-4974-b770-540be158539d', '8d6f4099-1632-435b-a12b-85048ed48c8a', 'goals', '2026-01-10T21:02:14.356673+00'),
  ('5079f88b-36e3-434a-af3b-2778a8997a15', '8d6f4099-1632-435b-a12b-85048ed48c8a', 'indicators', '2026-01-10T21:02:14.623503+00'),
  ('0a3cca5b-f0fd-4c58-8dde-88907fa79449', '8d6f4099-1632-435b-a12b-85048ed48c8a', 'marketing', '2026-01-10T21:02:14.512618+00'),
  ('9f9779f2-9d1f-45eb-99d2-f9221862e40d', '8d6f4099-1632-435b-a12b-85048ed48c8a', 'media', '2026-01-10T21:02:14.475125+00'),
  ('5a2c50c1-4add-4747-b44f-d6cfe733a43c', '8d6f4099-1632-435b-a12b-85048ed48c8a', 'monthly', '2026-01-10T21:02:14.396157+00'),
  ('d2f02990-35ee-4a1f-9e28-f46cc7650b8b', '8d6f4099-1632-435b-a12b-85048ed48c8a', 'sales', '2026-01-10T21:02:14.439613+00'),
  ('080be3b4-6de7-4ee3-a571-10b43a26f817', '8d6f4099-1632-435b-a12b-85048ed48c8a', 'structure', '2026-01-10T21:02:14.551245+00'),
  -- Daniel Trindade (daniel.trindade@o2inc.com.br)
  ('d37d6152-2956-4148-acc8-a016f0fd15cc', '8f658b59-e72e-41d6-8cbc-c5788bbeb01a', 'context', '2026-01-02T17:18:11.416252+00'),
  ('5eec797e-b90b-40d2-8913-8d7f401116e8', '8f658b59-e72e-41d6-8cbc-c5788bbeb01a', 'goals', '2026-01-02T17:18:11.416252+00'),
  ('fe83409b-dd4a-4d18-8d05-98c724dc8216', '8f658b59-e72e-41d6-8cbc-c5788bbeb01a', 'marketing', '2026-01-02T17:18:11.416252+00'),
  ('714b736e-2d86-4e50-8c2a-68f4a063621b', '8f658b59-e72e-41d6-8cbc-c5788bbeb01a', 'media', '2026-01-02T17:18:11.416252+00'),
  ('6ecdb00d-d397-4306-b621-1f6a2f1dd2bf', '8f658b59-e72e-41d6-8cbc-c5788bbeb01a', 'monthly', '2026-01-02T17:18:11.416252+00'),
  ('683f6881-261e-453a-92fc-9c1e6a5043af', '8f658b59-e72e-41d6-8cbc-c5788bbeb01a', 'sales', '2026-01-02T17:18:11.416252+00'),
  ('d07a2804-bc33-4a40-87d9-cfd236aa5481', '8f658b59-e72e-41d6-8cbc-c5788bbeb01a', 'structure', '2026-01-02T17:18:11.416252+00'),
  -- Marco Aurélio Azevedo (marco.azevedo@o2inc.com.br)
  ('c55088f5-8001-4fa2-a3d6-93cb3708a26e', 'b217396d-b250-41ea-aa10-2523b9d1d020', 'context', '2026-02-12T19:28:13.890976+00'),
  ('4d4cb6f4-6302-47ae-af65-7cab08c6a3b6', 'b217396d-b250-41ea-aa10-2523b9d1d020', 'goals', '2026-02-12T19:28:13.890976+00'),
  ('6bfd1bae-871c-4c69-bcd6-247047a44aee', 'b217396d-b250-41ea-aa10-2523b9d1d020', 'indicators', '2026-02-12T19:28:13.890976+00'),
  ('03436c32-2f7b-4052-9213-9cfed456c869', 'b217396d-b250-41ea-aa10-2523b9d1d020', 'marketing', '2026-02-12T19:28:13.890976+00'),
  ('69600c60-8134-4a37-8aad-bc54da34a3b5', 'b217396d-b250-41ea-aa10-2523b9d1d020', 'marketing_indicators', '2026-02-12T19:28:26.573835+00'),
  ('9a937fda-6f28-4fc1-b55f-157c5b5e75d6', 'b217396d-b250-41ea-aa10-2523b9d1d020', 'media', '2026-02-12T19:28:13.890976+00'),
  ('1f8fb57b-02a1-4ae4-87fe-8e5058490e58', 'b217396d-b250-41ea-aa10-2523b9d1d020', 'monthly', '2026-02-12T19:28:13.890976+00'),
  ('172d1fbf-7e3c-4c87-8b16-661e92f5c5af', 'b217396d-b250-41ea-aa10-2523b9d1d020', 'sales', '2026-02-12T19:28:13.890976+00'),
  ('ac564fec-cda3-4221-8a1f-bbb7f11fa63b', 'b217396d-b250-41ea-aa10-2523b9d1d020', 'structure', '2026-02-12T19:28:13.890976+00'),
  -- Andrey Lopes (andreylopes.ia@gmail.com)
  ('e6602a78-803e-4560-8e6d-facde6286913', 'cc1945c8-29dd-4fc5-bf28-32abcbec91dc', 'context', '2026-01-03T18:35:02.664937+00'),
  ('bf516603-6250-44df-a08d-0c7abab0ee66', 'cc1945c8-29dd-4fc5-bf28-32abcbec91dc', 'goals', '2026-01-03T18:35:02.664937+00'),
  ('fef5ea93-d3e5-4015-b7be-f3231575d7cb', 'cc1945c8-29dd-4fc5-bf28-32abcbec91dc', 'marketing', '2026-01-03T18:35:02.664937+00'),
  ('a5ec8f6f-0d9d-45cb-a61f-e159e66b8c74', 'cc1945c8-29dd-4fc5-bf28-32abcbec91dc', 'media', '2026-01-03T18:35:02.664937+00'),
  ('03bc4d0f-848c-44eb-8b99-9cf3368c6bf1', 'cc1945c8-29dd-4fc5-bf28-32abcbec91dc', 'monthly', '2026-01-03T18:35:02.664937+00'),
  ('52753cc4-27ea-4a58-82c5-b3c4973f318f', 'cc1945c8-29dd-4fc5-bf28-32abcbec91dc', 'sales', '2026-01-03T18:35:02.664937+00'),
  ('dffa90aa-1499-4e29-93ca-45532b63184d', 'cc1945c8-29dd-4fc5-bf28-32abcbec91dc', 'structure', '2026-01-03T18:35:02.664937+00'),
  -- Amanda Serafim (amanda.serafim@o2inc.com.br)
  ('c4b17779-ca6f-4fd2-b259-25c5d235eb7f', 'e291dc36-debd-429a-b55d-371f5a5b43d1', 'context', '2026-02-12T12:56:40.354545+00'),
  ('2bb48408-d0dd-4ed3-bef6-b4d985c43c1f', 'e291dc36-debd-429a-b55d-371f5a5b43d1', 'goals', '2026-02-12T12:56:40.354545+00'),
  ('c2ddbb45-f5b3-4d31-8045-ac04ead0671c', 'e291dc36-debd-429a-b55d-371f5a5b43d1', 'marketing', '2026-02-12T12:56:40.354545+00'),
  ('4df8927b-0154-4de8-bb04-1ffebd00058a', 'e291dc36-debd-429a-b55d-371f5a5b43d1', 'media', '2026-02-12T12:56:40.354545+00'),
  ('89047a6e-1630-4749-a3af-dc9c8a969d1c', 'e291dc36-debd-429a-b55d-371f5a5b43d1', 'monthly', '2026-02-12T12:56:40.354545+00'),
  ('1f57e61a-2c42-442f-9190-45d37d5ea974', 'e291dc36-debd-429a-b55d-371f5a5b43d1', 'sales', '2026-02-12T12:56:40.354545+00'),
  ('e07ed75d-7acc-44cd-9851-d12034efbd2c', 'e291dc36-debd-429a-b55d-371f5a5b43d1', 'structure', '2026-02-12T12:56:40.354545+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DATA: monetary_metas (48 registros)
-- ============================================

INSERT INTO public.monetary_metas (id, bu, month, year, vendas, ticket_medio, faturamento, mrr, setup, pontual, created_at, updated_at)
VALUES
  -- Franquia (12 meses)
  ('f3eb99a9-b022-4c07-9d30-ae2b1d98843d', 'franquia', 'Jan', 2026, 0, 140000, 0, 0, 0, 0, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('831f4204-087d-4d24-85dd-1b1f3d2468b0', 'franquia', 'Fev', 2026, 1, 140000, 140000, 0, 0, 140000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('64d4e3eb-9d07-428a-afe6-a69d82bf798a', 'franquia', 'Mar', 2026, 1, 140000, 140000, 0, 0, 140000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('1ee1e2cd-ebc9-4036-ab06-83f97678e4b4', 'franquia', 'Abr', 2026, 1, 140000, 140000, 0, 0, 140000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('8dc2d198-f35b-4f3d-97f6-e0bf3c42e2c8', 'franquia', 'Mai', 2026, 1, 140000, 140000, 0, 0, 140000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('cfd25385-fbbd-453c-be1f-11d5a5ac4011', 'franquia', 'Jun', 2026, 1, 140000, 140000, 0, 0, 140000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('9260f83d-e5b2-4e0e-bdb6-6292a2dc9734', 'franquia', 'Jul', 2026, 2, 140000, 280000, 0, 0, 280000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('f99c6f89-f941-4133-adf2-1dae4cf5b28b', 'franquia', 'Ago', 2026, 2, 140000, 280000, 0, 0, 280000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('70ae222b-f1fe-4dab-aa81-1f9006c140c5', 'franquia', 'Set', 2026, 2, 140000, 280000, 0, 0, 280000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('c35a0f5f-e09c-47a9-a03b-774164a9e65e', 'franquia', 'Out', 2026, 3, 140000, 420000, 0, 0, 420000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('758d1566-256f-4dfa-ac36-f7e7a8fc4a05', 'franquia', 'Nov', 2026, 3, 140000, 420000, 0, 0, 420000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('ff602c74-3949-4cf4-8ecf-741fa06fc72e', 'franquia', 'Dez', 2026, 3, 140000, 420000, 0, 0, 420000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  -- Modelo Atual (12 meses)
  ('623aa995-59a9-4d84-83c9-4c6ac6251b89', 'modelo_atual', 'Jan', 2026, 66, 17000, 1125000, 281250, 675000, 168750, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('48971388-36e9-4130-b4d1-ee07c219a831', 'modelo_atual', 'Fev', 2026, 70, 17000, 1181500, 295375, 708900, 177225, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('10ba53b7-a69b-4a42-9572-1723bde1c8aa', 'modelo_atual', 'Mar', 2026, 79, 17000, 1334610, 333653, 800766, 200192, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('dea347cf-287b-4a7c-8e7e-44b58f8494fc', 'modelo_atual', 'Abr', 2026, 85, 17000, 1442508, 360627, 865505, 216376, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('df7ee00f-b608-4e1f-8a15-25a82894a045', 'modelo_atual', 'Mai', 2026, 92, 17000, 1568205, 392051, 940923, 235231, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('792c7e2a-8491-45f0-a148-ac4d040f43b0', 'modelo_atual', 'Jun', 2026, 99, 17000, 1687913, 421978, 1012748, 253187, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('6c775921-36b0-4ea0-9759-7614251bd473', 'modelo_atual', 'Jul', 2026, 106, 17000, 1800000, 450000, 1080000, 270000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('16e40526-29de-4ff7-a6cd-01b724bbcc83', 'modelo_atual', 'Ago', 2026, 116, 17000, 1980000, 495000, 1188000, 297000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('0b1609d1-bf73-486b-b0b3-9bc3d198656c', 'modelo_atual', 'Set', 2026, 131, 17000, 2220000, 555000, 1332000, 333000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('c2287f35-55b7-41d9-8e9f-1cee08ddef41', 'modelo_atual', 'Out', 2026, 155, 17000, 2640000, 660000, 1584000, 396000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('78e373a7-33f5-42c1-ae01-99e721d750ae', 'modelo_atual', 'Nov', 2026, 174, 17000, 2960000, 740000, 1776000, 444000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('02807acb-c99c-4374-bbb7-a9a8885c25dc', 'modelo_atual', 'Dez', 2026, 141, 17000, 2400000, 600000, 1440000, 360000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  -- O2 Tax (12 meses)
  ('8eecdca5-a2ab-4c5c-8230-8feabc7a3036', 'o2_tax', 'Jan', 2026, 5, 15000, 80000, 20000, 48000, 12000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('471b5475-b8b0-4f54-9aa2-322ef05150cf', 'o2_tax', 'Fev', 2026, 9, 15000, 139923, 34981, 83954, 20988, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('3920121e-1624-48bf-8203-a6305564bc10', 'o2_tax', 'Mar', 2026, 5, 15000, 80000, 20000, 48000, 12000, '2026-02-02T14:25:58.92276+00', '2026-03-02T20:26:04.082233+00'),
  ('db0d4543-59ce-49f8-b442-578c9f0dd970', 'o2_tax', 'Abr', 2026, 17, 15000, 256466, 64117, 153880, 38470, '2026-02-02T14:25:58.92276+00', '2026-03-02T20:26:04.082233+00'),
  ('084eabbc-53fc-4811-abe1-08f2a7f6574e', 'o2_tax', 'Mai', 2026, 13, 15000, 197673, 49418, 118604, 29651, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('3d95b656-26e3-4bda-9ada-9ef8148fc65a', 'o2_tax', 'Jun', 2026, 15, 15000, 221153, 55288, 132692, 33173, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('f7f5e408-b6e1-41f6-901f-aa254e6bf73a', 'o2_tax', 'Jul', 2026, 16, 15000, 238563, 59641, 143138, 35784, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('ab017ffe-887a-41f4-851b-07f9c6fd27d5', 'o2_tax', 'Ago', 2026, 17, 15000, 262023, 65506, 157214, 39303, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('3354d246-21a8-4b4f-8980-5f25b4991549', 'o2_tax', 'Set', 2026, 20, 15000, 293303, 73326, 175982, 43995, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('f20f334f-bcda-40c5-8cb2-c7cabad87d72', 'o2_tax', 'Out', 2026, 21, 15000, 315963, 78991, 189578, 47394, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('39fff8f0-5e1d-44dd-af8b-8985ad42b44e', 'o2_tax', 'Nov', 2026, 23, 15000, 347163, 86791, 208298, 52074, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('4732d6f9-9364-4e98-a4ad-5ec85b8254b6', 'o2_tax', 'Dez', 2026, 26, 15000, 388770, 97193, 233262, 58316, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  -- Oxy Hacker (12 meses)
  ('0c224abe-9852-4a5b-a74f-83493f2e727a', 'oxy_hacker', 'Jan', 2026, 1, 54000, 54000, 0, 0, 54000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('15bbbc82-806c-4802-bf06-41c275370adf', 'oxy_hacker', 'Fev', 2026, 2, 54000, 108000, 0, 0, 108000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('2d83576c-115d-4968-af78-ffc1f10f0b35', 'oxy_hacker', 'Mar', 2026, 2, 54000, 108000, 0, 0, 108000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('d6a0c450-0136-44b8-9b7f-f8bc8497f359', 'oxy_hacker', 'Abr', 2026, 5, 54000, 270000, 0, 0, 270000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('446bb98d-3b60-4bc9-b8e9-5a9a8e6a9a81', 'oxy_hacker', 'Mai', 2026, 5, 54000, 270000, 0, 0, 270000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('8534f720-c555-4747-a842-0aa6ca194c5d', 'oxy_hacker', 'Jun', 2026, 5, 54000, 270000, 0, 0, 270000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('84463dca-6840-4ca1-a35d-fd0f63794ce6', 'oxy_hacker', 'Jul', 2026, 10, 54000, 540000, 0, 0, 540000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('a8f26976-a148-414d-a1e7-7cd58b565a94', 'oxy_hacker', 'Ago', 2026, 10, 54000, 540000, 0, 0, 540000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('08bf2f63-e133-45ae-bb15-b05902e40b22', 'oxy_hacker', 'Set', 2026, 10, 54000, 540000, 0, 0, 540000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('df990727-35af-420d-8dac-310c1cbece5a', 'oxy_hacker', 'Out', 2026, 15, 54000, 810000, 0, 0, 810000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('a312888d-1b2f-4edc-b0db-164193a3a59c', 'oxy_hacker', 'Nov', 2026, 18, 54000, 972000, 0, 0, 972000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00'),
  ('13fda4f6-86bd-431e-baa2-5b19ef9a1292', 'oxy_hacker', 'Dez', 2026, 17, 54000, 918000, 0, 0, 918000, '2026-02-02T14:25:58.92276+00', '2026-03-02T13:12:12.501872+00')
ON CONFLICT (id) DO UPDATE SET
  bu = EXCLUDED.bu,
  month = EXCLUDED.month,
  year = EXCLUDED.year,
  vendas = EXCLUDED.vendas,
  ticket_medio = EXCLUDED.ticket_medio,
  faturamento = EXCLUDED.faturamento,
  mrr = EXCLUDED.mrr,
  setup = EXCLUDED.setup,
  pontual = EXCLUDED.pontual,
  updated_at = now();

-- ============================================
-- DATA: closer_metas (84 registros)
-- ============================================

INSERT INTO public.closer_metas (id, bu, month, closer, percentage, year, created_at, updated_at)
VALUES
  -- Franquia - Daniel Trindade (0% todos os meses)
  ('f8f30759-73c9-479f-bfeb-a6abaee831f0', 'franquia', 'Jan', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:33.256688+00'),
  ('d9ab1ca6-df39-4150-a04e-8da7c7ea3a32', 'franquia', 'Fev', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:33.782818+00'),
  ('5437c88a-a8d0-40ff-9f7d-7c62cc13d068', 'franquia', 'Mar', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:34.310609+00'),
  ('309136f3-f6fa-42a9-b9e2-180351688c34', 'franquia', 'Abr', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:34.830536+00'),
  ('e905412e-1f94-4201-aa1c-5106a8843f95', 'franquia', 'Mai', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:35.358345+00'),
  ('3e96148a-0f56-466b-9a42-15fab0fd1458', 'franquia', 'Jun', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:35.879027+00'),
  ('d1da4807-6a07-4b56-b2c3-d3204e21f3ae', 'franquia', 'Jul', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:36.403944+00'),
  ('e0ebc45c-2eff-4444-9dec-e8972ed7f61e', 'franquia', 'Ago', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:36.930235+00'),
  ('338bab45-addb-4072-8d85-5a66494b061b', 'franquia', 'Set', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:37.482509+00'),
  ('eaaba2a4-f82c-4906-906b-6a7af1c036ad', 'franquia', 'Out', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:37.999342+00'),
  ('f6332c6c-28fc-45ad-ac27-8941891bd887', 'franquia', 'Nov', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:38.529643+00'),
  ('0de24eeb-e9e7-4389-916f-4b6e87950a47', 'franquia', 'Dez', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:39.074057+00'),
  -- Franquia - Pedro Albite (100% todos os meses)
  ('1d554330-8d90-4d7e-b85c-4586241010de', 'franquia', 'Jan', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:32.975068+00'),
  ('4a728153-8a3b-4e13-bb58-dbf1fb463e45', 'franquia', 'Fev', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:33.511145+00'),
  ('55e83db7-e7f4-46ea-b16c-08cdc7ed2c98', 'franquia', 'Mar', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:34.049812+00'),
  ('83b7bdd5-8305-474e-a3d2-b233c60b7555', 'franquia', 'Abr', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:34.567664+00'),
  ('80f15382-233d-4a0f-9270-8b6af7abcb9b', 'franquia', 'Mai', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:35.092736+00'),
  ('f91e5e5c-7d80-4baf-b254-bbef34f55eb2', 'franquia', 'Jun', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:35.617451+00'),
  ('0f1b6e3c-686d-45d9-a951-9ba69851de6d', 'franquia', 'Jul', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:36.135842+00'),
  ('3b22c832-5ed4-4555-9425-7032abf68f5c', 'franquia', 'Ago', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:36.672255+00'),
  ('53ffd06a-6801-4b18-829b-a58e648ae38d', 'franquia', 'Set', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:37.220641+00'),
  ('dcdd0a22-6ecc-4e64-8701-eb6542c853bd', 'franquia', 'Out', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:37.740303+00'),
  ('3b5f6e7a-e667-4412-a017-9e9301985928', 'franquia', 'Nov', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:38.261409+00'),
  ('52565e5a-a961-49a6-b03a-fa13e1f44aa3', 'franquia', 'Dez', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:38.797981+00'),
  -- Modelo Atual - Daniel Trindade
  ('176b75e3-f00b-4f44-b3ef-cf0b03a08478', 'modelo_atual', 'Jan', 'Daniel Trindade', 65, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:44.627319+00'),
  ('48c2a68d-ec3d-48ed-b9c6-80d11b4a4c5e', 'modelo_atual', 'Fev', 'Daniel Trindade', 70, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:45.372481+00'),
  ('aa17a7a6-7097-48f6-9cf7-832209e92e04', 'modelo_atual', 'Mar', 'Daniel Trindade', 80, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:45.968107+00'),
  ('83881da4-a696-4f20-ba13-1988181ecfa8', 'modelo_atual', 'Abr', 'Daniel Trindade', 90, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:46.656758+00'),
  ('88ad7bf9-0792-434a-9fc5-26a2d807db7f', 'modelo_atual', 'Mai', 'Daniel Trindade', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:47.169959+00'),
  ('72554268-66c6-4a2c-9ea9-10d12bb0bbbc', 'modelo_atual', 'Jun', 'Daniel Trindade', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:47.710376+00'),
  ('022e1719-ebb9-4291-90af-4e75160afc15', 'modelo_atual', 'Jul', 'Daniel Trindade', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:48.241915+00'),
  ('e2ef8a13-42bf-4e7b-8de5-e314614079de', 'modelo_atual', 'Ago', 'Daniel Trindade', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:48.74484+00'),
  ('07181315-e788-4cc4-86ad-90ea114f612e', 'modelo_atual', 'Set', 'Daniel Trindade', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:49.282751+00'),
  ('0ce39bc2-7bb8-4d0b-9b26-0a11ae00924d', 'modelo_atual', 'Out', 'Daniel Trindade', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:49.857974+00'),
  ('59929fa5-4c5a-4e89-8248-3a819def1a25', 'modelo_atual', 'Nov', 'Daniel Trindade', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:50.580925+00'),
  ('bc6e391f-c841-4df8-b9ee-50ea8d352b8c', 'modelo_atual', 'Dez', 'Daniel Trindade', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:51.09216+00'),
  -- Modelo Atual - Pedro Albite
  ('7135d040-45e3-46cb-80ac-5e8718ac163c', 'modelo_atual', 'Jan', 'Pedro Albite', 35, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:44.308896+00'),
  ('7c48c362-3425-4bb6-84bd-b8e2d281999b', 'modelo_atual', 'Fev', 'Pedro Albite', 30, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:44.951065+00'),
  ('bb5e5c6f-011f-4b3e-a63a-20ce2b6047c7', 'modelo_atual', 'Mar', 'Pedro Albite', 20, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:45.689866+00'),
  ('9a4499fe-ef1f-4ab5-83ee-4e2a91b4e56f', 'modelo_atual', 'Abr', 'Pedro Albite', 10, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:46.373827+00'),
  ('b3826721-6917-4951-a0ba-7455b8f9c45f', 'modelo_atual', 'Mai', 'Pedro Albite', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:46.915931+00'),
  ('a413f48a-1068-4a68-8dc6-099af13b9cd3', 'modelo_atual', 'Jun', 'Pedro Albite', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:47.432618+00'),
  ('e1461797-4959-4b95-aaa2-add119ad9317', 'modelo_atual', 'Jul', 'Pedro Albite', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:47.990885+00'),
  ('9742637c-9fda-4a65-8e14-456554a69a9b', 'modelo_atual', 'Ago', 'Pedro Albite', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:48.494499+00'),
  ('ed03f337-6c1a-4de0-aea9-fc2c7b9b9700', 'modelo_atual', 'Set', 'Pedro Albite', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:49.013599+00'),
  ('66218fd3-733f-4fdd-be22-3f414cc06e6a', 'modelo_atual', 'Out', 'Pedro Albite', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:49.538796+00'),
  ('e5461f78-51d8-4d64-9fb2-28ff68d1c7d8', 'modelo_atual', 'Nov', 'Pedro Albite', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:50.105761+00'),
  ('c589d4c7-593d-4c96-9e6f-1b617b2731d3', 'modelo_atual', 'Dez', 'Pedro Albite', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-03-05T13:39:50.83957+00'),
  -- O2 Tax - Lucas Ilha (100% todos os meses)
  ('913004e7-7a57-44e5-bf91-f5eb97e83bb1', 'o2_tax', 'Jan', 'Lucas Ilha', 100, 2026, '2026-01-28T12:21:31.556979+00', '2026-01-28T12:32:55.421716+00'),
  ('a75d2d54-6cac-45bb-a01a-87f0338464d2', 'o2_tax', 'Fev', 'Lucas Ilha', 100, 2026, '2026-01-28T12:21:31.556979+00', '2026-01-28T12:32:55.421716+00'),
  ('92e80add-2e9c-4220-bf53-59e62559a251', 'o2_tax', 'Mar', 'Lucas Ilha', 100, 2026, '2026-01-28T12:21:31.556979+00', '2026-01-28T12:32:55.421716+00'),
  ('3e9e82b4-2ab0-4df6-b822-9573395decb4', 'o2_tax', 'Abr', 'Lucas Ilha', 100, 2026, '2026-01-28T12:21:31.556979+00', '2026-01-28T12:32:55.421716+00'),
  ('1d8ac70d-8475-44f6-8f44-9d55e3edbeee', 'o2_tax', 'Mai', 'Lucas Ilha', 100, 2026, '2026-01-28T12:21:31.556979+00', '2026-01-28T12:32:55.421716+00'),
  ('4e0411d3-6009-4f8b-a9f8-9a75820d6199', 'o2_tax', 'Jun', 'Lucas Ilha', 100, 2026, '2026-01-28T12:21:31.556979+00', '2026-01-28T12:32:55.421716+00'),
  ('036e5a16-3c2a-42cd-aa93-3a1992d0aa53', 'o2_tax', 'Jul', 'Lucas Ilha', 100, 2026, '2026-01-28T12:21:31.556979+00', '2026-01-28T12:32:55.421716+00'),
  ('2d8f983d-5e0d-43c3-bf0a-fac3c3f3030a', 'o2_tax', 'Ago', 'Lucas Ilha', 100, 2026, '2026-01-28T12:21:31.556979+00', '2026-01-28T12:32:55.421716+00'),
  ('ed406ebd-26b1-4be3-b2e4-c8b651254870', 'o2_tax', 'Set', 'Lucas Ilha', 100, 2026, '2026-01-28T12:21:31.556979+00', '2026-01-28T12:32:55.421716+00'),
  ('e8bb7555-85a4-4a3d-bbc0-55f1cefe4ee0', 'o2_tax', 'Out', 'Lucas Ilha', 100, 2026, '2026-01-28T12:21:31.556979+00', '2026-01-28T12:32:55.421716+00'),
  ('fb30836e-ef16-475a-a7b4-313efccedd87', 'o2_tax', 'Nov', 'Lucas Ilha', 100, 2026, '2026-01-28T12:21:31.556979+00', '2026-01-28T12:32:55.421716+00'),
  ('dc9bffbd-6525-4b94-a756-ad1889e06f36', 'o2_tax', 'Dez', 'Lucas Ilha', 100, 2026, '2026-01-28T12:21:31.556979+00', '2026-01-28T12:32:55.421716+00'),
  -- Oxy Hacker - Daniel Trindade (0% todos os meses)
  ('f269fd88-e6dd-4107-8393-967f4c5e0b1b', 'oxy_hacker', 'Jan', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:02.946737+00'),
  ('85b87a04-46b3-471c-9fbf-bbbf73cd631c', 'oxy_hacker', 'Fev', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:03.604705+00'),
  ('1721248d-2a51-420a-bc71-c6b791145baf', 'oxy_hacker', 'Mar', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:04.22112+00'),
  ('5f905a4b-6ec1-4c3c-94f4-b7437bf4b2db', 'oxy_hacker', 'Abr', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:04.793072+00'),
  ('7d69d4d8-28a5-470b-b63e-080a229168bc', 'oxy_hacker', 'Mai', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:05.484247+00'),
  ('5706092e-aaf2-4c71-bff5-8c222362f8bd', 'oxy_hacker', 'Jun', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:06.047515+00'),
  ('457aa97a-284b-4edc-9baa-a71b3019f790', 'oxy_hacker', 'Jul', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:06.615957+00'),
  ('7716af31-f7e8-4461-8681-4117081dc71b', 'oxy_hacker', 'Ago', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:07.240624+00'),
  ('e21dc090-6658-467e-a031-4bac4b3ff9ba', 'oxy_hacker', 'Set', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:07.853143+00'),
  ('a0d36472-6879-487f-a91c-2a44e82b2153', 'oxy_hacker', 'Out', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:08.381162+00'),
  ('0566c117-3828-438b-9b41-132995059b0b', 'oxy_hacker', 'Nov', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:08.898616+00'),
  ('37135673-01ce-4487-b697-9cd01501b562', 'oxy_hacker', 'Dez', 'Daniel Trindade', 0, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:09.41986+00'),
  -- Oxy Hacker - Pedro Albite (100% todos os meses)
  ('8c8b6460-0134-407f-9de2-e86c100afb3d', 'oxy_hacker', 'Jan', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:02.573597+00'),
  ('6c5a8cf9-5071-40c4-9f40-9777257d6f44', 'oxy_hacker', 'Fev', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:03.287584+00'),
  ('d9a8fd7f-14be-4d9e-b57f-55f78591c32e', 'oxy_hacker', 'Mar', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:03.923855+00'),
  ('c0ccbf29-923d-40eb-9cca-0f29b28aa953', 'oxy_hacker', 'Abr', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:04.510663+00'),
  ('809f1f98-1396-4404-8c1d-398f064f7abd', 'oxy_hacker', 'Mai', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:05.152119+00'),
  ('ab154448-149f-4a8c-afbe-8c4a7596b057', 'oxy_hacker', 'Jun', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:05.766963+00'),
  ('b0d64919-c05d-4dac-886e-6084075dfa5c', 'oxy_hacker', 'Jul', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:06.320496+00'),
  ('8057a7e0-1e44-4b40-ada0-fe201462c1a7', 'oxy_hacker', 'Ago', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:06.93498+00'),
  ('1ada6f20-1847-4e28-a758-968a95cf0916', 'oxy_hacker', 'Set', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:07.570756+00'),
  ('d7ffbe63-cad9-4632-b8bb-f78b02284998', 'oxy_hacker', 'Out', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:08.118654+00'),
  ('50956999-2aeb-432a-9e20-f6b19043fdeb', 'oxy_hacker', 'Nov', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:08.639184+00'),
  ('be329267-dafd-4e7a-b5fa-a27e1295e564', 'oxy_hacker', 'Dez', 'Pedro Albite', 100, 2026, '2026-01-26T20:26:18.994735+00', '2026-01-30T14:36:09.156329+00')
ON CONFLICT (id) DO UPDATE SET
  bu = EXCLUDED.bu,
  month = EXCLUDED.month,
  closer = EXCLUDED.closer,
  percentage = EXCLUDED.percentage,
  updated_at = now();

-- ============================================
-- DATA: sales_realized (12 registros)
-- ============================================

INSERT INTO public.sales_realized (id, bu, month, year, value, created_at, updated_at)
VALUES
  ('a9a4d6ad-8c46-43c0-a676-270a74f21fd9', 'franquia', 'Jan', 2026, 0, '2026-01-02T16:31:37.012099+00', '2026-01-02T16:31:37.012099+00'),
  ('1c0f1ded-20e8-4c25-9a0e-bef77cdde3a9', 'franquia', 'Fev', 2026, 0, '2026-01-02T16:31:37.012099+00', '2026-01-02T16:31:37.012099+00'),
  ('404ba1c3-190c-460e-a09c-4e127f77a71e', 'franquia', 'Mar', 2026, 0, '2026-01-02T16:31:37.012099+00', '2026-01-02T16:31:37.012099+00'),
  ('9308360f-6288-42ec-bf7d-191493667b32', 'modelo_atual', 'Jan', 2026, 0, '2026-01-02T16:31:37.012099+00', '2026-01-02T16:31:37.012099+00'),
  ('305ada5e-a08a-4502-ac35-19163052ab5b', 'modelo_atual', 'Fev', 2026, 0, '2026-01-02T16:31:37.012099+00', '2026-01-02T16:31:37.012099+00'),
  ('d44447db-fd86-4a58-ba0c-6710c9ae9fd0', 'modelo_atual', 'Mar', 2026, 0, '2026-01-02T16:31:37.012099+00', '2026-01-02T16:31:37.012099+00'),
  ('151b7a84-464b-40ff-b919-a6afd4e434e3', 'o2_tax', 'Jan', 2026, 0, '2026-01-02T16:31:37.012099+00', '2026-01-02T16:31:37.012099+00'),
  ('48f90b6c-ac5c-4c80-9966-15ecaeec2bbe', 'o2_tax', 'Fev', 2026, 0, '2026-01-02T16:31:37.012099+00', '2026-01-02T16:31:37.012099+00'),
  ('a84f7aa5-68a8-490a-a725-7262d09cc031', 'o2_tax', 'Mar', 2026, 0, '2026-01-02T16:31:37.012099+00', '2026-01-02T16:31:37.012099+00'),
  ('1a9ce007-77b2-4192-9ad5-fb576c07fcf0', 'oxy_hacker', 'Jan', 2026, 0, '2026-01-02T16:31:37.012099+00', '2026-01-02T16:31:37.012099+00'),
  ('ef313073-5285-4f90-be30-f0ace95917aa', 'oxy_hacker', 'Fev', 2026, 0, '2026-01-02T16:31:37.012099+00', '2026-01-02T16:31:37.012099+00'),
  ('f61e087d-55d2-4eb3-85a8-27248e74e784', 'oxy_hacker', 'Mar', 2026, 0, '2026-01-02T16:31:37.012099+00', '2026-01-02T16:31:37.012099+00')
ON CONFLICT (id) DO UPDATE SET
  bu = EXCLUDED.bu,
  month = EXCLUDED.month,
  year = EXCLUDED.year,
  value = EXCLUDED.value,
  updated_at = now();

-- ============================================
-- DATA: mrr_base_monthly (15 registros)
-- ============================================

INSERT INTO public.mrr_base_monthly (id, month, year, value, is_total_override, created_at, updated_at)
VALUES
  -- 2025 (12 meses - MRR base histórico)
  ('7f6489c0-0c25-4860-8cb6-b44303451eef', 'Jan', 2025, 54406.85, false, '2026-03-09T09:29:42.033306+00', '2026-03-09T09:29:42.033306+00'),
  ('dc254861-60ac-4b09-96e1-038f2363f19a', 'Fev', 2025, 102648.26, false, '2026-03-09T09:29:42.033306+00', '2026-03-09T09:29:42.033306+00'),
  ('990beb60-ab7f-4966-a820-b143cb9efaf3', 'Mar', 2025, 102648.26, false, '2026-03-09T09:29:42.033306+00', '2026-03-09T09:29:42.033306+00'),
  ('492352be-181d-45b1-b3cb-3ea7d3db34aa', 'Abr', 2025, 117257.98, false, '2026-03-09T09:29:42.033306+00', '2026-03-09T09:29:42.033306+00'),
  ('457e7fc5-b3a4-4871-a516-c02803f5ecdf', 'Mai', 2025, 124362.52, false, '2026-03-09T09:29:42.033306+00', '2026-03-09T09:29:42.033306+00'),
  ('85ec5d07-8c4d-4c03-aa0b-43f4171e2d20', 'Jun', 2025, 147480.84, false, '2026-03-09T09:29:42.033306+00', '2026-03-09T09:29:42.033306+00'),
  ('5163251d-8f7d-4683-a220-4559aa91c264', 'Jul', 2025, 194161.92, false, '2026-03-09T09:29:42.033306+00', '2026-03-09T09:29:42.033306+00'),
  ('8de55a81-fdb9-4f52-a136-b915b66fdf82', 'Ago', 2025, 241320.12, false, '2026-03-09T09:29:42.033306+00', '2026-03-09T09:29:42.033306+00'),
  ('0c0c9cb7-6ac9-4a85-9a8b-ba38f606253e', 'Set', 2025, 277084.47, false, '2026-03-09T09:29:42.033306+00', '2026-03-09T09:29:42.033306+00'),
  ('54539a45-3134-4c32-96e9-611bf0b8cdd6', 'Out', 2025, 307948.63, false, '2026-03-09T09:29:42.033306+00', '2026-03-09T09:29:42.033306+00'),
  ('e7c62c38-eeb6-44f1-bd3e-e7fba0fd4960', 'Nov', 2025, 396439.73, false, '2026-03-09T09:29:42.033306+00', '2026-03-09T09:29:42.033306+00'),
  ('3c0b45cf-6b4a-488e-a6be-04b4e21ed93c', 'Dez', 2025, 453092.35, false, '2026-03-09T09:29:42.033306+00', '2026-03-09T09:29:42.033306+00'),
  -- 2026 (3 meses - total overrides)
  ('0236a1b7-eaca-4de8-a003-8252fda7bb68', 'Jan', 2026, 967968.89, true, '2026-03-09T09:29:42.033306+00', '2026-03-09T09:29:42.033306+00'),
  ('7ccf77fb-65f4-4ae0-9cf9-c80769f4c345', 'Fev', 2026, 809975.81, true, '2026-03-09T09:29:42.033306+00', '2026-03-09T09:29:42.033306+00'),
  ('a183c8d9-2d46-4865-a84a-cefc2b419a54', 'Mar', 2026, 939408.18, true, '2026-03-09T09:29:42.033306+00', '2026-03-09T09:29:42.033306+00')
ON CONFLICT (id) DO UPDATE SET
  month = EXCLUDED.month,
  year = EXCLUDED.year,
  value = EXCLUDED.value,
  is_total_override = EXCLUDED.is_total_override,
  updated_at = now();

-- ============================================
-- DATA: daily_revenue (72 registros)
-- ============================================

INSERT INTO public.daily_revenue (id, date, total_inflows, customer_count, year, synced_at)
VALUES
  ('ffe515b0-d3cc-4fba-b1ba-ca36d0b923d6', '2026-01-01', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('c419003e-6c0e-4ef0-98a7-799e9e9a113f', '2026-01-02', 56721.49, 4, 2026, '2026-03-13T20:04:28.904+00'),
  ('487ff423-d7e2-4c09-aab8-59548b56df04', '2026-01-03', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('587c4c58-85ca-4456-8099-c2db3f0a9f4f', '2026-01-04', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('d85ed62f-d65a-488e-baa2-7e58c0bd50a8', '2026-01-05', 68007.57, 11, 2026, '2026-03-13T20:04:28.904+00'),
  ('14236349-9d05-459e-b20e-3fd07d4d17b0', '2026-01-06', 26023.68, 5, 2026, '2026-03-13T20:04:28.904+00'),
  ('0da662b2-9d3c-4efa-ac85-7a64cbcd340b', '2026-01-07', 102117.84, 10, 2026, '2026-03-13T20:04:28.904+00'),
  ('17c3b92c-dbf3-4d27-ba46-380d2749db02', '2026-01-08', 15073.23, 3, 2026, '2026-03-13T20:04:28.904+00'),
  ('88c12c1b-690b-4a5a-b83a-8c1d7807305f', '2026-01-09', 21748.36, 4, 2026, '2026-03-13T20:04:28.904+00'),
  ('dddbf765-8ef1-435c-ae9b-314c46b01328', '2026-01-10', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('b4b72024-3d86-4208-82e0-4061e439c786', '2026-01-11', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('c29720eb-3120-4ab4-af74-dbf985de8c68', '2026-01-12', 44291.35, 5, 2026, '2026-03-13T20:04:28.904+00'),
  ('81cfbce7-7a29-4ce6-b53b-7b1a602ac886', '2026-01-13', 31500, 3, 2026, '2026-03-13T20:04:28.904+00'),
  ('57aea3af-4bd1-4936-86f7-3b934108120b', '2026-01-14', 17308.65, 6, 2026, '2026-03-13T20:04:28.904+00'),
  ('7ac2bede-0498-4724-8e21-c627f7f57b5c', '2026-01-15', 32898.45, 5, 2026, '2026-03-13T20:04:28.904+00'),
  ('40b2526c-b2eb-40b9-9cf0-1b61dac7284f', '2026-01-16', 40343.93, 8, 2026, '2026-03-13T20:04:28.904+00'),
  ('757de11e-aa00-4451-bf73-7f491b9476f5', '2026-01-17', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('67e7bc81-9036-463c-8fa8-714d4b422cb3', '2026-01-18', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('2dd329e7-470e-498a-8fea-d8a7cd258d2f', '2026-01-19', 19614.71, 6, 2026, '2026-03-13T20:04:28.904+00'),
  ('8542bad0-7d32-4bc0-be6b-e3df3d4259a3', '2026-01-20', 15647.97, 5, 2026, '2026-03-13T20:04:28.904+00'),
  ('b42d1017-923c-4298-8cf3-52e2e9869606', '2026-01-21', 15644.3, 6, 2026, '2026-03-13T20:04:28.904+00'),
  ('74750497-38be-4eb4-b3c4-5041de03b160', '2026-01-22', 31372.71, 6, 2026, '2026-03-13T20:04:28.904+00'),
  ('27954a4e-f77f-472f-b115-2b86b00bc5b6', '2026-01-23', 9292.2, 4, 2026, '2026-03-13T20:04:28.904+00'),
  ('d0835add-2e92-48cc-8ff4-a8cc7e0090a9', '2026-01-24', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('4f62d248-aa1b-4122-9468-b2c70c110eb9', '2026-01-25', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('e1489dbf-b758-4225-941b-8f6dff1197f4', '2026-01-26', 50430.24, 10, 2026, '2026-03-13T20:04:28.904+00'),
  ('3bb70018-39a6-4da3-9d9e-526ad8389274', '2026-01-27', 20053.54, 6, 2026, '2026-03-13T20:04:28.904+00'),
  ('7c197762-35ca-472c-8264-37d9c96be9d0', '2026-01-28', 82568.17, 10, 2026, '2026-03-13T20:04:28.904+00'),
  ('d5276d7c-913f-4e72-a7f6-b2206b28b948', '2026-01-29', 84563.62, 10, 2026, '2026-03-13T20:04:28.904+00'),
  ('0cfc5b20-c679-472a-9c39-737d5040f8dc', '2026-01-30', 155961.25, 19, 2026, '2026-03-13T20:04:28.904+00'),
  ('c630e309-c625-4fb2-bdda-2a938295a27a', '2026-01-31', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('f8e1fa9e-1f3d-4199-a2b9-7ee9cc7fa68c', '2026-02-01', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('90bde39e-1828-439f-b8ac-51667146fc82', '2026-02-02', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('ffb4e9b5-915d-491c-8c9c-6398aac0a45a', '2026-02-03', 91285.34, 16, 2026, '2026-03-13T20:04:28.904+00'),
  ('2e24b6ea-276a-45f9-917b-5d3c452aa845', '2026-02-04', 52378.38, 6, 2026, '2026-03-13T20:04:28.904+00'),
  ('b3782684-12ac-4da1-b27d-666ff7d09e42', '2026-02-05', 41380.89, 7, 2026, '2026-03-13T20:04:28.904+00'),
  ('abd24e34-bc6f-42dd-b9d0-40bd58080fc4', '2026-02-06', 29914.47, 6, 2026, '2026-03-13T20:04:28.904+00'),
  ('a7f5b074-3f20-46f0-9bc2-6299167110a1', '2026-02-07', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('ae2ce936-e5c8-407d-937f-ff131fa16968', '2026-02-08', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('3534ea8b-97f2-445a-a2e9-d47218e80e4b', '2026-02-09', 86313.45, 9, 2026, '2026-03-13T20:04:28.904+00'),
  ('34433c57-b10c-4561-b57c-341ffc11173b', '2026-02-10', 41908.88, 8, 2026, '2026-03-13T20:04:28.904+00'),
  ('ab462d49-f0e0-44a9-a00b-09faf5e87937', '2026-02-11', 17590.84, 5, 2026, '2026-03-13T20:04:28.904+00'),
  ('775c2a25-9a42-40f0-bfcf-9a8d04a134fc', '2026-02-12', 46980.25, 7, 2026, '2026-03-13T20:04:28.904+00'),
  ('ecdcc05b-3757-4064-ac7d-a97fed774f35', '2026-02-13', 23610.56, 6, 2026, '2026-03-13T20:04:28.904+00'),
  ('0df4aac3-a6a6-408e-8f6c-1cf391e6b2de', '2026-02-14', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('e13ba5d2-2cee-46ef-b5cf-3becc5cdf2b4', '2026-02-15', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('5642048e-e520-41d3-8ae1-089a9b0f4c80', '2026-02-16', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('cf90d616-15c5-49d6-95de-4b63f1a189ae', '2026-02-17', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('3fc32993-cb80-49ef-9357-cd68fa2ce2af', '2026-02-18', 41889.29, 10, 2026, '2026-03-13T20:04:28.904+00'),
  ('2f211d40-246f-469a-ac15-74fecaf00598', '2026-02-19', 49949.1, 6, 2026, '2026-03-13T20:04:28.904+00'),
  ('924843fe-0a84-4c1b-bba0-d4fb30fd6442', '2026-02-20', 33978.78, 9, 2026, '2026-03-13T20:04:28.904+00'),
  ('27698b7a-0241-4c2a-96c2-d31d7617ae09', '2026-02-21', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('903c04e2-e0ad-4014-9415-5d499b967439', '2026-02-22', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('75f867b2-1e9c-40d0-9d7c-dd83e36dc728', '2026-02-23', 29606.33, 7, 2026, '2026-03-13T20:04:28.904+00'),
  ('d0997968-67e3-4fdc-b928-419b35e32ff4', '2026-02-24', 47795.74, 10, 2026, '2026-03-13T20:04:28.904+00'),
  ('789d14ef-4903-437f-ae8b-3ee346988f9f', '2026-02-25', 29089.92, 4, 2026, '2026-03-13T20:04:28.904+00'),
  ('15e2f2f8-79c0-4934-b746-65e8e64b4314', '2026-02-26', 36177.27, 4, 2026, '2026-03-13T20:04:28.904+00'),
  ('6c248016-3250-490a-a189-6bf0e12d2377', '2026-02-27', 105585.6, 8, 2026, '2026-03-13T20:04:28.904+00'),
  ('a52a9bc0-f85a-4ae5-95b0-cd3f18506a99', '2026-02-28', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('0b9717d1-40ae-4e5e-b7d5-b6d1a26a7052', '2026-03-01', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('09489549-5f37-4122-ba11-125f8656b388', '2026-03-02', 49075.45, 9, 2026, '2026-03-13T20:04:28.904+00'),
  ('4f50af17-bcc5-4c49-8244-c243a903fdcc', '2026-03-03', 7814.97, 5, 2026, '2026-03-13T20:04:28.904+00'),
  ('2b969a95-b13e-458d-820f-4b80dd2e1193', '2026-03-04', 5661.68, 3, 2026, '2026-03-13T20:04:28.904+00'),
  ('955ee5d3-b431-4343-a617-10bb3102c875', '2026-03-05', 21980.04, 3, 2026, '2026-03-13T20:04:28.904+00'),
  ('d726f7cb-f34d-4eb0-b3bc-f1b2f848eeff', '2026-03-06', 164191.22, 24, 2026, '2026-03-13T20:04:28.904+00'),
  ('9a2ab184-7401-4281-8e8c-574ec73ad447', '2026-03-07', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('3e518895-583b-4dc7-b5aa-a3cdd83ae565', '2026-03-08', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('1266f54d-4307-4a73-b4b2-e03311f85ae6', '2026-03-09', 23970.25, 4, 2026, '2026-03-13T20:04:28.904+00'),
  ('c03d94aa-c58c-4713-bb32-fed1eab99b00', '2026-03-10', 9229.08, 3, 2026, '2026-03-13T20:04:28.904+00'),
  ('47355afe-f4ed-4e7d-8f00-e5ea82aca3df', '2026-03-11', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('3463fdd6-cdd7-46e6-ab0a-e1d3c1222d8b', '2026-03-12', 0, 0, 2026, '2026-03-13T20:04:28.904+00'),
  ('b3b4264c-4670-4677-b8df-b4df77b68cb7', '2026-03-13', 0, 0, 2026, '2026-03-13T20:04:28.904+00')
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  total_inflows = EXCLUDED.total_inflows,
  customer_count = EXCLUDED.customer_count,
  year = EXCLUDED.year,
  synced_at = now();

-- ============================================
-- DATA: funnel_realized (666 registros)
-- NOTA: Esta tabela é sincronizada automaticamente
-- via Edge Function sync-pipefy-funnel.
-- Os dados podem ser re-sincronizados após migração.
-- Omitido deste backup por volume.
-- Para restaurar: execute a sync-pipefy-funnel function.
-- ============================================

-- ============================================
-- DATA: admin_audit_logs (28 registros)
-- NOTA: Logs de auditoria são históricos.
-- Omitidos do seed por serem específicos do projeto atual.
-- ============================================

-- ============================================
-- DATA: cost_stage_metas (0 registros - vazio)
-- ============================================

-- ============================================
-- DATA: meta_ads_cache (cache temporário - omitido)
-- ============================================

-- ============================================
-- EDGE FUNCTIONS SECRETS (configurar manualmente)
-- ============================================
-- Os seguintes secrets precisam ser configurados:
-- - GOOGLE_ADS_DEVELOPER_TOKEN
-- - GOOGLE_ADS_CLIENT_ID
-- - GOOGLE_ADS_CLIENT_SECRET
-- - GOOGLE_ADS_REFRESH_TOKEN
-- - GOOGLE_ADS_CUSTOMER_ID
-- - META_AD_ACCOUNT_ID
-- - META_ACCESS_TOKEN
-- - EXTERNAL_PG_HOST
-- - EXTERNAL_PG_PORT
-- - EXTERNAL_PG_DATABASE
-- - EXTERNAL_PG_USER
-- - EXTERNAL_PG_PASSWORD
-- - EXTERNAL_SUPABASE_URL
-- - EXTERNAL_SUPABASE_KEY
-- - PIPEFY_API_KEY
-- - OXY_FINANCE_API_KEY
-- - GOOGLE_SHEET_ID
-- - LOVABLE_API_KEY

-- ============================================
-- FIM DO BACKUP COMPLETO
-- ============================================
