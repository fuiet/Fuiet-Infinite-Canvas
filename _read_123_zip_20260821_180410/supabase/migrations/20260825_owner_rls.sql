begin;

create table if not exists public.canvas_users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.providers add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists public.projects add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists public.tasks add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists public.media_assets add column if not exists owner_id uuid references auth.users(id) on delete cascade;

create index if not exists providers_owner_id_idx on public.providers(owner_id);
create index if not exists projects_owner_id_idx on public.projects(owner_id);
create index if not exists tasks_owner_id_idx on public.tasks(owner_id);
create index if not exists tasks_owner_status_idx on public.tasks(owner_id, status);
create index if not exists media_assets_owner_id_idx on public.media_assets(owner_id);

alter table public.canvas_users enable row level security;
alter table if exists public.providers enable row level security;
alter table if exists public.projects enable row level security;
alter table if exists public.tasks enable row level security;
alter table if exists public.media_assets enable row level security;

drop policy if exists canvas_users_self on public.canvas_users;
create policy canvas_users_self on public.canvas_users
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

do $$
declare
  t text;
begin
  foreach t in array array['providers','projects','tasks','media_assets'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I_owner_select on public.%I', t, t);
      execute format('drop policy if exists %I_owner_insert on public.%I', t, t);
      execute format('drop policy if exists %I_owner_update on public.%I', t, t);
      execute format('drop policy if exists %I_owner_delete on public.%I', t, t);
      execute format('create policy %I_owner_select on public.%I for select using (owner_id = auth.uid())', t, t);
      execute format('create policy %I_owner_insert on public.%I for insert with check (owner_id = auth.uid())', t, t);
      execute format('create policy %I_owner_update on public.%I for update using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t, t);
      execute format('create policy %I_owner_delete on public.%I for delete using (owner_id = auth.uid())', t, t);
    end if;
  end loop;
end $$;

-- Existing rows intentionally remain owner_id = null. Assign them to a real auth.users.id
-- before switching browser traffic from the service-role gateway to direct Supabase access.

commit;
