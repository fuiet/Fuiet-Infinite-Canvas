begin;

create table if not exists public.canvas_users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.canvas_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists canvas_users_touch_updated_at on public.canvas_users;
create trigger canvas_users_touch_updated_at
before update on public.canvas_users
for each row execute function public.canvas_touch_updated_at();

create or replace function public.canvas_create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.canvas_users(id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists canvas_auth_user_created on auth.users;
create trigger canvas_auth_user_created
after insert on auth.users
for each row execute function public.canvas_create_user_profile();

insert into public.canvas_users(id)
select id from auth.users
on conflict (id) do nothing;

alter table public.canvas_users enable row level security;

drop policy if exists canvas_users_self on public.canvas_users;
create policy canvas_users_self on public.canvas_users
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- Add owner_id, indexes, RLS and owner-only policies only for tables that actually exist.
-- This keeps the migration safe on partial/older installations and reruns.
do $$
declare
  t text;
  has_status boolean;
begin
  foreach t in array array['providers','projects','tasks','media_assets'] loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    execute format(
      'alter table public.%I add column if not exists owner_id uuid references auth.users(id) on delete cascade',
      t
    );
    execute format('create index if not exists %I on public.%I(owner_id)', t || '_owner_id_idx', t);

    if t = 'tasks' then
      select exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'tasks' and column_name = 'status'
      ) into has_status;
      if has_status then
        execute 'create index if not exists tasks_owner_status_idx on public.tasks(owner_id, status)';
      end if;
    end if;

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_owner_select on public.%I', t, t);
    execute format('drop policy if exists %I_owner_insert on public.%I', t, t);
    execute format('drop policy if exists %I_owner_update on public.%I', t, t);
    execute format('drop policy if exists %I_owner_delete on public.%I', t, t);
    execute format('create policy %I_owner_select on public.%I for select using (owner_id = auth.uid())', t, t);
    execute format('create policy %I_owner_insert on public.%I for insert with check (owner_id = auth.uid())', t, t);
    execute format('create policy %I_owner_update on public.%I for update using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t, t);
    execute format('create policy %I_owner_delete on public.%I for delete using (owner_id = auth.uid())', t, t);
  end loop;
end $$;

-- Existing rows intentionally remain owner_id = null unless a later relationship/backfill
-- migration can prove their owner. Never assign all ownerless rows implicitly in SQL.

commit;
