begin;

-- This migration complements 20260825_owner_rls.sql.
-- It preserves existing IDs/types, adds typed task relationships dynamically,
-- and propagates owner_id from server-owned JSON payloads before RLS evaluation.

create or replace function public.canvas_safe_uuid(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  if value is null or btrim(value) = '' then return null; end if;
  return value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create or replace function public.canvas_apply_provider_owner()
returns trigger
language plpgsql
as $$
begin
  if new.owner_id is null then
    new.owner_id := public.canvas_safe_uuid(new.data->>'ownerId');
  end if;
  return new;
end;
$$;

create or replace function public.canvas_apply_project_owner()
returns trigger
language plpgsql
as $$
begin
  if new.owner_id is null then
    new.owner_id := public.canvas_safe_uuid(new.data->>'ownerId');
  end if;
  return new;
end;
$$;

create or replace function public.canvas_apply_task_owner_and_refs()
returns trigger
language plpgsql
as $$
begin
  if new.owner_id is null then
    new.owner_id := public.canvas_safe_uuid(new.payload->>'ownerId');
  end if;

  if new.owner_id is null then
    select p.owner_id into new.owner_id
    from public.providers p
    where p.id::text = new.payload->>'providerId'
    limit 1;
  end if;

  if new.owner_id is null and new.project_id is not null then
    select p.owner_id into new.owner_id
    from public.projects p
    where p.id::text = new.project_id::text
    limit 1;
  end if;

  if to_jsonb(new) ? 'provider_ref' and new.provider_ref is null then
    select p.id into new.provider_ref
    from public.providers p
    where p.id::text = new.payload->>'providerId'
    limit 1;
  end if;

  if to_jsonb(new) ? 'project_ref' and new.project_ref is null then
    select p.id into new.project_ref
    from public.projects p
    where p.id::text = new.payload->>'projectId'
    limit 1;
  end if;

  return new;
end;
$$;

create or replace function public.canvas_apply_media_owner()
returns trigger
language plpgsql
as $$
begin
  if new.owner_id is null and new.task_id is not null then
    select t.owner_id into new.owner_id
    from public.tasks t
    where t.id = new.task_id
    limit 1;
  end if;
  return new;
end;
$$;

-- Keep task relationship columns the same type as the referenced primary keys.
do $$
declare
  provider_type text;
  project_type text;
begin
  if to_regclass('public.tasks') is null then return; end if;

  if to_regclass('public.providers') is not null then
    select format_type(a.atttypid, a.atttypmod)
      into provider_type
    from pg_attribute a
    where a.attrelid = 'public.providers'::regclass
      and a.attname = 'id'
      and not a.attisdropped;

    if provider_type is not null and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'tasks' and column_name = 'provider_ref'
    ) then
      execute format('alter table public.tasks add column provider_ref %s', provider_type);
    end if;
  end if;

  if to_regclass('public.projects') is not null then
    select format_type(a.atttypid, a.atttypmod)
      into project_type
    from pg_attribute a
    where a.attrelid = 'public.projects'::regclass
      and a.attname = 'id'
      and not a.attisdropped;

    if project_type is not null and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'tasks' and column_name = 'project_ref'
    ) then
      execute format('alter table public.tasks add column project_ref %s', project_type);
    end if;
  end if;
end $$;

-- Backfill relationship columns using textual equality so legacy prefixed IDs remain valid.
do $$
begin
  if to_regclass('public.tasks') is not null and to_regclass('public.providers') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='provider_ref') then
    update public.tasks t
      set provider_ref = p.id
    from public.providers p
    where t.provider_ref is null
      and p.id::text = t.payload->>'providerId';
  end if;

  if to_regclass('public.tasks') is not null and to_regclass('public.projects') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='project_ref') then
    update public.tasks t
      set project_ref = p.id
    from public.projects p
    where t.project_ref is null
      and p.id::text = t.payload->>'projectId';
  end if;
end $$;

-- Add FKs only after typed columns exist.
do $$
begin
  if to_regclass('public.tasks') is not null and to_regclass('public.providers') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='provider_ref')
     and not exists (select 1 from pg_constraint where conname = 'tasks_provider_ref_fkey') then
    alter table public.tasks
      add constraint tasks_provider_ref_fkey
      foreign key (provider_ref) references public.providers(id)
      on delete set null not valid;
  end if;

  if to_regclass('public.tasks') is not null and to_regclass('public.projects') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='project_ref')
     and not exists (select 1 from pg_constraint where conname = 'tasks_project_ref_fkey') then
    alter table public.tasks
      add constraint tasks_project_ref_fkey
      foreign key (project_ref) references public.projects(id)
      on delete set null not valid;
  end if;
end $$;

create index if not exists tasks_provider_ref_idx on public.tasks(provider_ref);
create index if not exists tasks_project_ref_idx on public.tasks(project_ref);

-- Install owner propagation triggers after backfill helpers exist.
drop trigger if exists providers_apply_owner on public.providers;
create trigger providers_apply_owner
before insert or update on public.providers
for each row execute function public.canvas_apply_provider_owner();

drop trigger if exists projects_apply_owner on public.projects;
create trigger projects_apply_owner
before insert or update on public.projects
for each row execute function public.canvas_apply_project_owner();

drop trigger if exists tasks_apply_owner_and_refs on public.tasks;
create trigger tasks_apply_owner_and_refs
before insert or update on public.tasks
for each row execute function public.canvas_apply_task_owner_and_refs();

drop trigger if exists media_assets_apply_owner on public.media_assets;
create trigger media_assets_apply_owner
before insert or update on public.media_assets
for each row execute function public.canvas_apply_media_owner();

-- Backfill owner_id where JSON already contains the owner marker.
update public.providers
set owner_id = public.canvas_safe_uuid(data->>'ownerId')
where owner_id is null and public.canvas_safe_uuid(data->>'ownerId') is not null;

update public.projects
set owner_id = public.canvas_safe_uuid(data->>'ownerId')
where owner_id is null and public.canvas_safe_uuid(data->>'ownerId') is not null;

update public.tasks t
set owner_id = coalesce(
  public.canvas_safe_uuid(t.payload->>'ownerId'),
  p.owner_id,
  pr.owner_id
)
from public.providers p
left join public.projects pr on pr.id::text = t.payload->>'projectId'
where t.owner_id is null
  and p.id::text = t.payload->>'providerId';

update public.media_assets m
set owner_id = t.owner_id
from public.tasks t
where m.owner_id is null
  and m.task_id = t.id
  and t.owner_id is not null;

-- RLS policies from the first migration remain owner-based. Service-role traffic still
-- bypasses RLS, so dist/server/production-entry.js independently enforces ownership.

commit;
