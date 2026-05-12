-- Full sacrament program: JSON body + member FKs; one row per ward+date; ordered speakers.

alter table public.sacrament_meetings
  add column if not exists program jsonb not null default '{}'::jsonb,
  add column if not exists presiding_member_id uuid references public.members (id) on delete set null,
  add column if not exists chorister_member_id uuid references public.members (id) on delete set null,
  add column if not exists organist_member_id uuid references public.members (id) on delete set null,
  add column if not exists opening_prayer_member_id uuid references public.members (id) on delete set null,
  add column if not exists closing_prayer_member_id uuid references public.members (id) on delete set null;

-- Backfill program with empty object where null (should not happen with default)
update public.sacrament_meetings set program = '{}'::jsonb where program is null;

create unique index if not exists sacrament_meetings_ward_id_date_key
  on public.sacrament_meetings (ward_id, date);

create index if not exists sacrament_meetings_ward_id_date_desc_idx
  on public.sacrament_meetings (ward_id, date desc);

-- Speaker slot ordering (1 = first speaker, etc.)
alter table public.sacrament_speakers
  add column if not exists position smallint not null default 1;

update public.sacrament_speakers ss
set position = sub.rn
from (
  select
    id,
    row_number() over (partition by meeting_id order by created_at, id) as rn
  from public.sacrament_speakers
) sub
where ss.id = sub.id;

create unique index if not exists sacrament_speakers_meeting_position_key
  on public.sacrament_speakers (meeting_id, position);

alter table public.sacrament_speakers
  add constraint sacrament_speakers_position_range check (position >= 1 and position <= 8);

-- Allow empty speaker slots in the form (user saves before assigning everyone)
alter table public.sacrament_speakers
  alter column member_id drop not null;
