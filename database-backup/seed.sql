-- ============================================
-- SEED SQL - Backup do Banco de Dados
-- Projeto: Planning 2026 - Oxy Capital
-- Data de Exportação: 2025-01-04
-- ============================================

-- IMPORTANTE: Este arquivo NÃO inclui senhas de usuários.
-- Os usuários precisarão redefinir suas senhas após reimportação.
-- A tabela auth.users é gerenciada pelo Supabase Auth.

-- ============================================
-- 1. PROFILES (Perfis de Usuários)
-- ============================================
-- Nota: Os IDs devem corresponder aos IDs na tabela auth.users
-- Você precisará criar os usuários no Supabase Auth primeiro

INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
VALUES 
  ('0b4c4fff-b5f7-4fb0-8056-f23f0e39a9d1', 'admin@oxycapital.com', 'Administrador', '2025-01-03T12:37:20.568688+00:00', '2025-01-03T12:37:20.568688+00:00'),
  ('8cc95d1e-2d69-4e51-8b2b-a8f44b8f8c9f', 'almir@oxycapital.com', 'Almir', '2025-01-03T14:52:36.050296+00:00', '2025-01-03T14:52:36.050296+00:00'),
  ('c30b1aa7-19e5-4d68-9e58-10b91f5a0b63', 'bruna@oxycapital.com', 'Bruna Eduarda', '2025-01-03T17:59:20.377063+00:00', '2025-01-03T17:59:20.377063+00:00'),
  ('ce392d28-5e62-4714-9bc0-94ebf4d3a8f9', 'bruno@oxycapital.com', 'Bruno Duarte', '2025-01-03T14:49:42.587896+00:00', '2025-01-03T14:49:42.587896+00:00'),
  ('29b5f20e-c794-4c1b-8b93-7ef47a2b0e2f', 'jose@oxycapital.com', 'Jose Neto', '2025-01-03T14:51:07.88991+00:00', '2025-01-03T14:51:07.88991+00:00')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();

-- ============================================
-- 2. USER_ROLES (Roles dos Usuários)
-- ============================================

INSERT INTO public.user_roles (id, user_id, role, created_at)
VALUES 
  ('20fdab39-dc7e-4fc1-9e4f-c83a6e95b72e', '0b4c4fff-b5f7-4fb0-8056-f23f0e39a9d1', 'admin', '2025-01-03T12:37:20.568688+00:00'),
  ('f3045a54-3e53-4b17-96e1-c6de8e24f52a', '8cc95d1e-2d69-4e51-8b2b-a8f44b8f8c9f', 'user', '2025-01-03T14:52:36.050296+00:00'),
  ('c7ee70e9-1e48-4b8d-9215-d40ab1f837a9', 'c30b1aa7-19e5-4d68-9e58-10b91f5a0b63', 'user', '2025-01-03T17:59:20.377063+00:00'),
  ('ec89dd07-29d0-4e24-b7dc-9f27e9c9a9c3', 'ce392d28-5e62-4714-9bc0-94ebf4d3a8f9', 'admin', '2025-01-03T14:49:42.587896+00:00'),
  ('cfec17a9-2bd9-40ad-9d8b-cd1d3ac8b5f2', '29b5f20e-c794-4c1b-8b93-7ef47a2b0e2f', 'user', '2025-01-03T14:51:07.88991+00:00')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role;

-- ============================================
-- 3. USER_TAB_PERMISSIONS (Permissões de Abas)
-- ============================================

INSERT INTO public.user_tab_permissions (id, user_id, tab_key, created_at)
VALUES 
  -- Almir (almir@oxycapital.com)
  ('d2c72fbe-3f2c-4e1e-ab10-e4e5ae4e0a23', '8cc95d1e-2d69-4e51-8b2b-a8f44b8f8c9f', 'metas-de-vendas', '2025-01-03T15:40:15.547+00:00'),
  ('27aadc75-d1cf-4a35-a2b7-9c2fd8cb10de', '8cc95d1e-2d69-4e51-8b2b-a8f44b8f8c9f', 'plano-de-marketing', '2025-01-03T15:40:15.547+00:00'),
  ('edc05915-6849-486e-b59f-f66b6a5da9f9', '8cc95d1e-2d69-4e51-8b2b-a8f44b8f8c9f', 'receita-mensal', '2025-01-03T15:40:15.547+00:00'),
  ('a8c3e7f1-2b4d-4f9e-c0a5-9d1e6b3f2a7c', '8cc95d1e-2d69-4e51-8b2b-a8f44b8f8c9f', 'contexto-2025', '2025-01-03T19:30:00.000+00:00'),
  ('3f7b2e9a-1c5d-4a8f-b6e0-4a2c9d1f7e3b', '8cc95d1e-2d69-4e51-8b2b-a8f44b8f8c9f', 'estrutura', '2025-01-03T19:30:00.000+00:00'),
  ('c2e9a1f4-8b3d-4f7e-a5c0-6d1b2e7f9a3c', '8cc95d1e-2d69-4e51-8b2b-a8f44b8f8c9f', 'investimento-midia', '2025-01-03T19:30:00.000+00:00'),
  
  -- Jose Neto (jose@oxycapital.com)
  ('bfc28c68-9741-4d6a-bd6f-2b4c7df7c7d0', '29b5f20e-c794-4c1b-8b93-7ef47a2b0e2f', 'metas-2026', '2025-01-03T15:40:15.547+00:00'),
  ('c98f4aa4-0f72-4c70-b8a1-1e87e7b8c4a6', '29b5f20e-c794-4c1b-8b93-7ef47a2b0e2f', 'metas-de-vendas', '2025-01-03T15:40:15.547+00:00'),
  ('15ec8287-3c0d-4a59-87c1-d71ea9e0bf9d', '29b5f20e-c794-4c1b-8b93-7ef47a2b0e2f', 'plano-de-marketing', '2025-01-03T15:40:15.547+00:00'),
  ('97c0e93f-7b45-4d5e-9a3c-8f62e1a9d2c7', '29b5f20e-c794-4c1b-8b93-7ef47a2b0e2f', 'receita-mensal', '2025-01-03T15:40:15.547+00:00'),
  
  -- Bruna Eduarda (bruna@oxycapital.com)
  ('31f7e3b2-5c8a-4d92-a0f6-7e4c9b2d1a8f', 'c30b1aa7-19e5-4d68-9e58-10b91f5a0b63', 'contexto-2025', '2025-01-03T18:00:30.123+00:00'),
  ('8e2f1c4d-6a7b-4e9f-b3c2-1d5a8f7e0c9b', 'c30b1aa7-19e5-4d68-9e58-10b91f5a0b63', 'estrutura', '2025-01-03T18:00:30.123+00:00'),
  ('f4a7c2e1-9b3d-4f8e-a6c0-2e7b1d9f5a3c', 'c30b1aa7-19e5-4d68-9e58-10b91f5a0b63', 'investimento-midia', '2025-01-03T18:00:30.123+00:00'),
  ('2c9e5b7a-1d4f-4a8c-b0e3-6f2a9c1d7e4b', 'c30b1aa7-19e5-4d68-9e58-10b91f5a0b63', 'metas-2026', '2025-01-03T18:00:30.123+00:00'),
  ('7a3f1e9c-4b2d-4c6e-9f8a-0e5b2c7d1a4f', 'c30b1aa7-19e5-4d68-9e58-10b91f5a0b63', 'metas-de-vendas', '2025-01-03T18:00:30.123+00:00'),
  ('e1b4c7f2-8a3d-4e5f-b9c0-3f6a2e1d8c7b', 'c30b1aa7-19e5-4d68-9e58-10b91f5a0b63', 'plano-de-marketing', '2025-01-03T18:00:30.123+00:00'),
  ('5d2a9f1e-7c4b-4a3e-8f6d-1b0e7c2a5f9d', 'c30b1aa7-19e5-4d68-9e58-10b91f5a0b63', 'receita-mensal', '2025-01-03T18:00:30.123+00:00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. SALES_REALIZED (Vendas Realizadas)
-- ============================================

INSERT INTO public.sales_realized (id, bu, month, year, value, created_at, updated_at)
VALUES 
  -- Expansão O2
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expansao', 'Jan', 2026, 0, '2025-01-03T12:00:00+00:00', '2025-01-03T12:00:00+00:00'),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'expansao', 'Fev', 2026, 0, '2025-01-03T12:00:00+00:00', '2025-01-03T12:00:00+00:00'),
  ('c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', 'expansao', 'Mar', 2026, 0, '2025-01-03T12:00:00+00:00', '2025-01-03T12:00:00+00:00'),
  
  -- Reativação
  ('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a', 'reativacao', 'Jan', 2026, 0, '2025-01-03T12:00:00+00:00', '2025-01-03T12:00:00+00:00'),
  ('e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b', 'reativacao', 'Fev', 2026, 0, '2025-01-03T12:00:00+00:00', '2025-01-03T12:00:00+00:00'),
  ('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c', 'reativacao', 'Mar', 2026, 0, '2025-01-03T12:00:00+00:00', '2025-01-03T12:00:00+00:00'),
  
  -- Hunter
  ('a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d', 'hunter', 'Jan', 2026, 0, '2025-01-03T12:00:00+00:00', '2025-01-03T12:00:00+00:00'),
  ('b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e', 'hunter', 'Fev', 2026, 0, '2025-01-03T12:00:00+00:00', '2025-01-03T12:00:00+00:00'),
  ('c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f', 'hunter', 'Mar', 2026, 0, '2025-01-03T12:00:00+00:00', '2025-01-03T12:00:00+00:00'),
  
  -- Inbound
  ('d0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a', 'inbound', 'Jan', 2026, 0, '2025-01-03T12:00:00+00:00', '2025-01-03T12:00:00+00:00'),
  ('e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b', 'inbound', 'Fev', 2026, 0, '2025-01-03T12:00:00+00:00', '2025-01-03T12:00:00+00:00'),
  ('f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c', 'inbound', 'Mar', 2026, 0, '2025-01-03T12:00:00+00:00', '2025-01-03T12:00:00+00:00')
ON CONFLICT (id) DO UPDATE SET
  bu = EXCLUDED.bu,
  month = EXCLUDED.month,
  year = EXCLUDED.year,
  value = EXCLUDED.value,
  updated_at = now();

-- ============================================
-- FIM DO SEED
-- ============================================
