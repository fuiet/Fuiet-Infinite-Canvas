begin;

-- Complements 20260825_owner_rls.sql.
-- Preserves legacy id types, adds typed relationships, backfills only provable ownership,
-- and adds database-side owner consistency checks in addition to the HTTP gateway.

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
security definer
set search_path = public
as $$
declare
  provider_owner uuid;
  project_owner uuid;
begin
  if new.owner_id is null then
    new.owner_id := public.canvas_safe_uuid(new.payload->>'ownerId');
  end if;

  if coalesce(new.payload->>'providerId', '') <> '' then
    select p.id, p.owner_id
      into new.provider_ref, provider_owner
    from public.providers p
    where p.id::text = new.payload->>'providerId'
    limit 1;

    if provider_owner is not null then
      if new.owner_id is null then
        new.owner_id := provider_owner;
      elsif new.owner_id <> provider_owner then
        raise exception 'task owner does not match provider owner';
      end if;
    end if;
  end if;

  if coalesce(new.payload->>'projectId', '') <> '' then
    select p.id, p.owner_id
      into new.project_ref, project_owner
    from public.projects p
    where p.id::text = new.payload->>'projectId'
    limit 1;

    if project_owner is not null then
      if new.owner_id is null then
        new.owner_id := project_owner;
      elsif new.owner_id <> project_owner then
        raise exception 'task owner does not match project owner';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.canvas_apply_media_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  task_owner uuid;
begin
  if new.task_id is not null then
    select t.owner_id into task_owner
    from public.tasks t
    where t.id = new.task_id
    limit 1;

    if task_owner is not null then
      if new.owner_id is null then
        new.owner_id := task_owner;
      elsif new.owner_id <> task_owner then
        raise exception 'media owner does not match task owner';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Add provider_ref/project_ref with exactly the same type as the referenced id columns.
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
      where table_schema='public' and table_name='tasks' and column_name='provider_ref'
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
      where table_schema='public' and table_name='tasks' and column_name='project_ref'
    ) then
      execute format('alter table public.tasks add column project_ref %s', project_type);
    end if;
  end if;
end $$;

-- Backfill relationship ids before adding triggers/FKs.
do $$
begin
  if to_regclass('public.tasks') is not null
     and to_regclass('public.providers') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='provider_ref')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='payload') then
    update public.tasks t
       set provider_ref = p.id
      from public.providers p
     where t.provider_ref is null
       and p.id::text = t.payload->>'providerId';
  end if;

  if to_regclass('public.tasks') is not null
     and to_regclass('public.projects') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='project_ref')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='payload') then
    update public.tasks t
       set project_ref = p.id
      from public.projects p
     where t.project_ref is null
       and p.id::text = t.payload->>'projectId';
  end if;
end $$;

-- Add FK constraints only when their typed columns exist. NOT VALID still enforces new rows
-- while allowing a controlled cleanup of any unexpected legacy values.
do $$
begin
  if to_regclass('public.tasks') is not null and to_regclass('public.providers') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='provider_ref')
     and not exists (
       select 1 from pg_constraint
       where conrelid='public.tasks'::regclass and conname='tasks_provider_ref_fkey'
     ) then
    alter table public.tasks
      add constraint tasks_provider_ref_fkey
      foreign key (provider_ref) references public.providers(id)
      on delete set null not valid;
  end if;

  if to_regclass('public.tasks') is not null and to_regclass('public.projects') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='project_ref')
     and not exists (
       select 1 from pg_constraint
       where conrelid='public.tasks'::regclass and conname='tasks_project_ref_fkey'
     ) then
    alter table public.tasks
      add constraint tasks_project_ref_fkey
      foreign key (project_ref) references public.projects(id)
      on delete set null not valid;
  end if;
end $$;

-- Indexes are dynamic so partial schemas do not make the migration fail.
do $$
begin
  if to_regclass('public.tasks') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='provider_ref') then
    create index if not exists tasks_provider_ref_idx on public.tasks(provider_ref);
  end if;
  if to_regclass('public.tasks') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='project_ref') then
    create index if not exists tasks_project_ref_idx on public.tasks(project_ref);
  end if;
end $$;

-- Backfill only ownership that can be proven from JSON markers or already-owned relations.
do $$
begin
  if to_regclass('public.providers') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='providers' and column_name='data')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='providers' and column_name='owner_id') then
    update public.providers
       set owner_id = public.canvas_safe_uuid(data->>'ownerId')
     where owner_id is null
       and public.canvas_safe_uuid(data->>'ownerId') is not null;
  end if;

  if to_regclass('public.projects') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='data')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='owner_id') then
    update public.projects
       set owner_id = public.canvas_safe_uuid(data->>'ownerId')
     where owner_id is null
       and public.canvas_safe_uuid(data->>'ownerId') is not null;
  end if;

  if to_regclass('public.tasks') is not null
     and to_regclass('public.providers') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='payload')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='owner_id') then
    update public.tasks t
       set owner_id = coalesce(public.canvas_safe_uuid(t.payload->>'ownerId'), p.owner_id)
      from public.providers p
     where t.owner_id is null
       and p.id::text = t.payload->>'providerId'
       and coalesce(public.canvas_safe_uuid(t.payload->>'ownerId'), p.owner_id) is not null;
  end if;

  if to_regclass('public.tasks') is not null
     and to_regclass('public.projects') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='payload')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='owner_id') then
    update public.tasks t
       set owner_id = p.owner_id
      from public.projects p
     where t.owner_id is null
       and p.id::text = t.payload->>'projectId'
       and p.owner_id is not null;
  end if;

  if to_regclass('public.media_assets') is not null
     and to_regclass('public.tasks') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='media_assets' and column_name='task_id')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='media_assets' and column_name='owner_id') then
    update public.media_assets m
       set owner_id = t.owner_id
      from public.tasks t
     where m.owner_id is null
       and m.task_id = t.id
       and t.owner_id is not null;
  end if;
end $$;

-- Install triggers only when all columns/tables they depend on exist.
do $$
begin
  if to_regclass('public.providers') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='providers' and column_name='data')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='providers' and column_name='owner_id') then
    drop trigger if exists providers_apply_owner on public.providers;
    create trigger providers_apply_owner
      before insert or update on public.providers
      for each row execute function public.canvas_apply_provider_owner();
  end if;

  if to_regclass('public.projects') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='data')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='owner_id') then
    drop trigger if exists projects_apply_owner on public.projects;
    create trigger projects_apply_owner
      before insert or update on public.projects
      for each row execute function public.canvas_apply_project_owner();
  end if;

  if to_regclass('public.tasks') is not null
     and to_regclass('public.providers') is not null
     and to_regclass('public.projects') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='payload')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='owner_id')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='provider_ref')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='project_ref') then
    drop trigger if exists tasks_apply_owner_and_refs on public.tasks;
    create trigger tasks_apply_owner_and_refs
      before insert or update on public.tasks
      for each row execute function public.canvas_apply_task_owner_and_refs();
  end if;

  if to_regclass('public.media_assets') is not null
     and to_regclass('public.tasks') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='media_assets' and column_name='task_id')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='media_assets' and column_name='owner_id') then
    drop trigger if exists media_assets_apply_owner on public.media_assets;
    create trigger media_assets_apply_owner
      before insert or update on public.media_assets
      for each row execute function public.canvas_apply_media_owner();
  end if;
end $$;

commit;
