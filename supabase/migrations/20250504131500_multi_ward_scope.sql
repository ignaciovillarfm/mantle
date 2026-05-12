-- Multi-ward tenancy and ward-scoped authorization

create table if not exists public.wards (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists wards_set_updated_at on public.wards;
create trigger wards_set_updated_at
before update on public.wards
for each row execute function public.set_updated_at();

insert into public.wards (name) values ('Default Ward')
on conflict (name) do nothing;

alter table public.user_roles add column if not exists ward_id uuid references public.wards (id) on delete cascade;
alter table public.organizations add column if not exists ward_id uuid references public.wards (id) on delete cascade;
alter table public.members add column if not exists ward_id uuid references public.wards (id) on delete cascade;
alter table public.callings add column if not exists ward_id uuid references public.wards (id) on delete cascade;
alter table public.calling_history add column if not exists ward_id uuid references public.wards (id) on delete cascade;
alter table public.sacrament_meetings add column if not exists ward_id uuid references public.wards (id) on delete cascade;
alter table public.sacrament_speakers add column if not exists ward_id uuid references public.wards (id) on delete cascade;
alter table public.temple_recommends add column if not exists ward_id uuid references public.wards (id) on delete cascade;
alter table public.bishop_notes add column if not exists ward_id uuid references public.wards (id) on delete cascade;
alter table public.feature_flags add column if not exists ward_id uuid references public.wards (id) on delete cascade;
alter table public.audit_logs add column if not exists ward_id uuid references public.wards (id) on delete set null;

with default_ward as (
  select id from public.wards order by created_at asc limit 1
)
update public.user_roles ur
set ward_id = dw.id
from default_ward dw
where ur.ward_id is null;

with default_ward as (
  select id from public.wards order by created_at asc limit 1
)
update public.organizations o
set ward_id = dw.id
from default_ward dw
where o.ward_id is null;

update public.members m
set ward_id = o.ward_id
from public.organizations o
where m.organization_id = o.id
  and m.ward_id is null;

with default_ward as (
  select id from public.wards order by created_at asc limit 1
)
update public.members m
set ward_id = dw.id
from default_ward dw
where m.ward_id is null;

update public.callings c
set ward_id = m.ward_id
from public.members m
where c.member_id = m.id
  and c.ward_id is null;

with default_ward as (
  select id from public.wards order by created_at asc limit 1
)
update public.callings c
set ward_id = dw.id
from default_ward dw
where c.ward_id is null;

update public.calling_history ch
set ward_id = c.ward_id
from public.callings c
where ch.calling_id = c.id
  and ch.ward_id is null;

with default_ward as (
  select id from public.wards order by created_at asc limit 1
)
update public.calling_history ch
set ward_id = dw.id
from default_ward dw
where ch.ward_id is null;

with default_ward as (
  select id from public.wards order by created_at asc limit 1
)
update public.sacrament_meetings sm
set ward_id = dw.id
from default_ward dw
where sm.ward_id is null;

update public.sacrament_speakers ss
set ward_id = sm.ward_id
from public.sacrament_meetings sm
where ss.meeting_id = sm.id
  and ss.ward_id is null;

with default_ward as (
  select id from public.wards order by created_at asc limit 1
)
update public.sacrament_speakers ss
set ward_id = dw.id
from default_ward dw
where ss.ward_id is null;

update public.temple_recommends tr
set ward_id = m.ward_id
from public.members m
where tr.member_id = m.id
  and tr.ward_id is null;

with default_ward as (
  select id from public.wards order by created_at asc limit 1
)
update public.temple_recommends tr
set ward_id = dw.id
from default_ward dw
where tr.ward_id is null;

update public.bishop_notes bn
set ward_id = m.ward_id
from public.members m
where bn.member_id = m.id
  and bn.ward_id is null;

with default_ward as (
  select id from public.wards order by created_at asc limit 1
)
update public.bishop_notes bn
set ward_id = dw.id
from default_ward dw
where bn.ward_id is null;

with default_ward as (
  select id from public.wards order by created_at asc limit 1
)
update public.feature_flags ff
set ward_id = dw.id
from default_ward dw
where ff.ward_id is null;

with default_ward as (
  select id from public.wards order by created_at asc limit 1
)
update public.audit_logs al
set ward_id = dw.id
from default_ward dw
where al.ward_id is null;

alter table public.user_roles
  drop constraint if exists user_roles_user_id_role_key;
drop index if exists user_roles_user_id_idx;
create unique index if not exists user_roles_user_ward_role_uidx on public.user_roles (user_id, ward_id, role);
create index if not exists user_roles_user_id_idx on public.user_roles (user_id);
create index if not exists user_roles_ward_id_idx on public.user_roles (ward_id);

create index if not exists organizations_ward_id_idx on public.organizations (ward_id);
create index if not exists members_ward_id_idx on public.members (ward_id);
create index if not exists callings_ward_id_idx on public.callings (ward_id);
create index if not exists calling_history_ward_id_idx on public.calling_history (ward_id);
create index if not exists sacrament_meetings_ward_id_idx on public.sacrament_meetings (ward_id);
create index if not exists sacrament_speakers_ward_id_idx on public.sacrament_speakers (ward_id);
create index if not exists temple_recommends_ward_id_idx on public.temple_recommends (ward_id);
create index if not exists bishop_notes_ward_id_idx on public.bishop_notes (ward_id);
create index if not exists feature_flags_ward_id_idx on public.feature_flags (ward_id);
create index if not exists audit_logs_ward_id_idx on public.audit_logs (ward_id);

alter table public.feature_flags drop constraint if exists feature_flags_key_key;
create unique index if not exists feature_flags_ward_key_uidx on public.feature_flags (ward_id, key);

alter table public.user_roles alter column ward_id set not null;
alter table public.organizations alter column ward_id set not null;
alter table public.members alter column ward_id set not null;
alter table public.callings alter column ward_id set not null;
alter table public.calling_history alter column ward_id set not null;
alter table public.sacrament_meetings alter column ward_id set not null;
alter table public.sacrament_speakers alter column ward_id set not null;
alter table public.temple_recommends alter column ward_id set not null;
alter table public.bishop_notes alter column ward_id set not null;
alter table public.feature_flags alter column ward_id set not null;

-- Replace broad role policies with ward-scoped policies
drop policy if exists user_roles_select_authenticated on public.user_roles;
create policy user_roles_select_own
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists organizations_all_leadership on public.organizations;
create policy organizations_all_leadership_per_ward
on public.organizations
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = organizations.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = organizations.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

drop policy if exists members_all_leadership on public.members;
create policy members_all_leadership_per_ward
on public.members
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = members.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = members.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

drop policy if exists callings_all_leadership on public.callings;
create policy callings_all_leadership_per_ward
on public.callings
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = callings.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = callings.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

drop policy if exists calling_history_select_leadership on public.calling_history;
drop policy if exists calling_history_insert_leadership on public.calling_history;
create policy calling_history_select_leadership_per_ward
on public.calling_history
for select
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = calling_history.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);
create policy calling_history_insert_leadership_per_ward
on public.calling_history
for insert
to authenticated
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = calling_history.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

drop policy if exists sacrament_meetings_all_leadership on public.sacrament_meetings;
create policy sacrament_meetings_all_leadership_per_ward
on public.sacrament_meetings
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = sacrament_meetings.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = sacrament_meetings.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

drop policy if exists sacrament_speakers_all_leadership on public.sacrament_speakers;
create policy sacrament_speakers_all_leadership_per_ward
on public.sacrament_speakers
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = sacrament_speakers.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = sacrament_speakers.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

drop policy if exists temple_recommends_all_bishop_counselor on public.temple_recommends;
create policy temple_recommends_all_bishop_counselor_per_ward
on public.temple_recommends
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = temple_recommends.ward_id
      and ur.role in ('bishop', 'counselor')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = temple_recommends.ward_id
      and ur.role in ('bishop', 'counselor')
  )
);

drop policy if exists bishop_notes_bishop_only on public.bishop_notes;
create policy bishop_notes_bishop_only_per_ward
on public.bishop_notes
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = bishop_notes.ward_id
      and ur.role = 'bishop'
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = bishop_notes.ward_id
      and ur.role = 'bishop'
  )
);

drop policy if exists feature_flags_select_leadership on public.feature_flags;
drop policy if exists feature_flags_insert_bishop on public.feature_flags;
drop policy if exists feature_flags_update_bishop on public.feature_flags;
drop policy if exists feature_flags_delete_bishop on public.feature_flags;
create policy feature_flags_select_leadership_per_ward
on public.feature_flags
for select
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = feature_flags.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);
create policy feature_flags_insert_bishop_per_ward
on public.feature_flags
for insert
to authenticated
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = feature_flags.ward_id
      and ur.role = 'bishop'
  )
);
create policy feature_flags_update_bishop_per_ward
on public.feature_flags
for update
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = feature_flags.ward_id
      and ur.role = 'bishop'
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = feature_flags.ward_id
      and ur.role = 'bishop'
  )
);
create policy feature_flags_delete_bishop_per_ward
on public.feature_flags
for delete
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = feature_flags.ward_id
      and ur.role = 'bishop'
  )
);
