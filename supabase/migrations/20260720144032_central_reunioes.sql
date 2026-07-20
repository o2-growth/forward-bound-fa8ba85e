-- Central de Reuniões: app_state singleton-per-id table used by the
-- central-reunioes-sync edge function to persist the shared meetings list.
create table if not exists public.central_reunioes_app_state (
  id text primary key,
  data jsonb not null default '[]'::jsonb,
  rev bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- RLS: qualquer usuário autenticado pode ler/escrever (a edge function fará controle)
alter table public.central_reunioes_app_state enable row level security;

do $$
begin
  create policy "authenticated read" on public.central_reunioes_app_state
    for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "authenticated write" on public.central_reunioes_app_state
    for insert to authenticated with check (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "authenticated update" on public.central_reunioes_app_state
    for update to authenticated using (true);
exception when duplicate_object then null;
end $$;

-- Supabase no longer grants public-schema access to service_role by default
grant all on public.central_reunioes_app_state to service_role;
grant select, insert, update on public.central_reunioes_app_state to authenticated;
