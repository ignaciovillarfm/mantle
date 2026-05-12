-- Preset calling titles per ward (dropdown). Assignments stay on `callings`; optional FK links them.

create table public.calling_positions (
  id uuid primary key default gen_random_uuid(),
  ward_id uuid not null references public.wards (id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calling_positions_title_trim check (char_length(trim(title)) > 0)
);

create unique index calling_positions_ward_title_uidx on public.calling_positions (ward_id, title);

create index calling_positions_ward_sort_idx
  on public.calling_positions (ward_id, sort_order, title);

create trigger calling_positions_set_updated_at
before update on public.calling_positions
for each row execute function public.set_updated_at();

alter table public.callings
  add column if not exists calling_position_id uuid references public.calling_positions (id) on delete set null;

create index if not exists callings_calling_position_id_idx
  on public.callings (calling_position_id)
  where calling_position_id is not null;

alter table public.calling_positions enable row level security;

create policy calling_positions_all_leadership_per_ward
on public.calling_positions
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = calling_positions.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = calling_positions.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

-- Common English presets for every existing ward.
insert into public.calling_positions (ward_id, title, sort_order)
select w.id, x.title, x.sort_order
from public.wards w
cross join (
  values
    ('Bishop', 10),
    ('First Counselor in the Bishopric', 20),
    ('Second Counselor in the Bishopric', 30),
    ('Ward Executive Secretary', 40),
    ('Ward Clerk', 50),
    ('Assistant Ward Clerk', 60),
    ('Elders Quorum President', 100),
    ('First Counselor in the Elders Quorum Presidency', 110),
    ('Second Counselor in the Elders Quorum Presidency', 120),
    ('Elders Quorum Secretary', 130),
    ('Relief Society President', 200),
    ('First Counselor in the Relief Society Presidency', 210),
    ('Second Counselor in the Relief Society Presidency', 220),
    ('Relief Society Secretary', 230),
    ('Young Men President', 300),
    ('Young Women President', 310),
    ('Primary President', 320),
    ('Sunday School President', 330),
    ('Ward Mission Leader', 400),
    ('Ward Temple and Family History Leader', 410)
) as x(title, sort_order);

-- New wards get the same preset list automatically (skips duplicates).
create or replace function public.seed_calling_positions_for_ward(p_ward_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.calling_positions (ward_id, title, sort_order)
  select p_ward_id, x.title, x.sort_order
  from (
    values
      ('Bishop', 10),
      ('First Counselor in the Bishopric', 20),
      ('Second Counselor in the Bishopric', 30),
      ('Ward Executive Secretary', 40),
      ('Ward Clerk', 50),
      ('Assistant Ward Clerk', 60),
      ('Elders Quorum President', 100),
      ('First Counselor in the Elders Quorum Presidency', 110),
      ('Second Counselor in the Elders Quorum Presidency', 120),
      ('Elders Quorum Secretary', 130),
      ('Relief Society President', 200),
      ('First Counselor in the Relief Society Presidency', 210),
      ('Second Counselor in the Relief Society Presidency', 220),
      ('Relief Society Secretary', 230),
      ('Young Men President', 300),
      ('Young Women President', 310),
      ('Primary President', 320),
      ('Sunday School President', 330),
      ('Ward Mission Leader', 400),
      ('Ward Temple and Family History Leader', 410)
  ) as x(title, sort_order)
  on conflict (ward_id, title) do nothing;
end;
$$;

create or replace function public.trg_wards_seed_calling_positions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_calling_positions_for_ward(new.id);
  return new;
end;
$$;

drop trigger if exists wards_seed_calling_positions on public.wards;
create trigger wards_seed_calling_positions
after insert on public.wards
for each row execute function public.trg_wards_seed_calling_positions();

comment on table public.calling_positions is
  'Ward catalog of common calling titles for dropdowns; callings.calling_position_id optionally references a preset.';
comment on column public.callings.calling_position_id is
  'When set, matches a preset row; custom-only callings leave this null and use name text.';
