-- «Vår reisebok»: shared archive for Knut and Anna.
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- Every trip, memory, place, dream and upcoming trip is one row in `entities`,
-- with its content as JSON. Each write gets a new `version` (for conflict
-- detection) and a new `seq` (so a phone can ask «what changed since seq N?»).
-- Only the two people listed in `members` can read or write anything.

-- Who is who ---------------------------------------------------------------

create table if not exists public.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  person text not null unique check (person in ('knut', 'anna'))
);

alter table public.members enable row level security;

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.members where user_id = auth.uid());
$$;

drop policy if exists "members can see members" on public.members;
create policy "members can see members" on public.members
  for select using (public.is_member());

-- The archive -------------------------------------------------------------

create sequence if not exists public.entity_seq;

create table if not exists public.entities (
  id text primary key,                 -- '<kind>:<id>', e.g. 'memory:m3'
  kind text not null check (kind in ('trip', 'memory', 'place', 'dream', 'upcoming')),
  data jsonb not null,
  deleted boolean not null default false,
  version integer not null default 0,
  seq bigint not null default nextval('public.entity_seq'),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

create index if not exists entities_seq_idx on public.entities (seq);

create or replace function public.entities_stamp()
returns trigger
language plpgsql
as $$
begin
  new.version := coalesce(old.version, 0) + 1;
  new.seq := nextval('public.entity_seq');
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists entities_stamp on public.entities;
create trigger entities_stamp
  before insert or update on public.entities
  for each row execute function public.entities_stamp();

alter table public.entities enable row level security;

drop policy if exists "members read" on public.entities;
create policy "members read" on public.entities for select using (public.is_member());
drop policy if exists "members insert" on public.entities;
create policy "members insert" on public.entities for insert with check (public.is_member());
drop policy if exists "members update" on public.entities;
create policy "members update" on public.entities for update using (public.is_member()) with check (public.is_member());
-- No delete policy: deletions are tombstones (deleted = true) so the other phone learns about them.

-- Write with conflict detection: succeeds only if the row is still at the version
-- the phone last saw. Otherwise returns the current row so the phone can merge.
create or replace function public.push_entity(p_id text, p_kind text, p_data jsonb, p_base integer, p_deleted boolean)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  cur public.entities;
begin
  if not public.is_member() then
    raise exception 'not a member';
  end if;
  select * into cur from public.entities where id = p_id for update;
  if not found then
    insert into public.entities (id, kind, data, deleted) values (p_id, p_kind, p_data, p_deleted) returning * into cur;
    return jsonb_build_object('ok', true, 'row', to_jsonb(cur));
  end if;
  if p_base is null or cur.version <> p_base then
    return jsonb_build_object('ok', false, 'row', to_jsonb(cur));
  end if;
  update public.entities set data = p_data, deleted = p_deleted where id = p_id returning * into cur;
  return jsonb_build_object('ok', true, 'row', to_jsonb(cur));
end;
$$;

-- Live updates to the other phone.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'entities') then
    alter publication supabase_realtime add table public.entities;
  end if;
end;
$$;

-- Photos ------------------------------------------------------------------
-- Private bucket: originals at <photoId>/original, display copies at <photoId>/display.jpg.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "members read photos" on storage.objects;
create policy "members read photos" on storage.objects for select using (bucket_id = 'photos' and public.is_member());
drop policy if exists "members add photos" on storage.objects;
create policy "members add photos" on storage.objects for insert with check (bucket_id = 'photos' and public.is_member());
drop policy if exists "members replace photos" on storage.objects;
create policy "members replace photos" on storage.objects for update using (bucket_id = 'photos' and public.is_member());
drop policy if exists "members delete photos" on storage.objects;
create policy "members delete photos" on storage.objects for delete using (bucket_id = 'photos' and public.is_member());
