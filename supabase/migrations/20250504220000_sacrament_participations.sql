-- Single table for "who did what this Sunday" + pastoral follow-up (discourses + prayers).
-- Replaces engagement on sacrament_speakers / sacrament_meetings and drops sacrament_speakers.
-- Prerequisite migrations: 20250504200000 (talk_* on speakers), 20250504210000 (prayer engagement on meetings).

create table public.sacrament_participations (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.sacrament_meetings (id) on delete cascade,
  ward_id uuid not null references public.wards (id) on delete cascade,
  slot text not null
    constraint sacrament_participations_slot_check
    check (
      slot in (
        'discourse_1',
        'discourse_2',
        'discourse_3',
        'opening_prayer',
        'closing_prayer'
      )
    ),
  member_id uuid references public.members (id) on delete set null,
  topic text,
  response_status text not null default 'pending'
    constraint sacrament_participations_response_status_check
    check (response_status in ('pending', 'accepted', 'declined')),
  response_note text,
  fulfilled boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id, slot)
);

create index sacrament_participations_meeting_id_idx on public.sacrament_participations (meeting_id);
create index sacrament_participations_member_ward_idx
  on public.sacrament_participations (member_id, ward_id)
  where member_id is not null;

create trigger sacrament_participations_set_updated_at
before update on public.sacrament_participations
for each row execute function public.set_updated_at();

alter table public.sacrament_participations enable row level security;

create policy sacrament_participations_all_leadership_per_ward
on public.sacrament_participations
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = sacrament_participations.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = sacrament_participations.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

-- Discourse rows from legacy sacrament_speakers (positions 1–3).
insert into public.sacrament_participations (
  meeting_id,
  ward_id,
  slot,
  member_id,
  topic,
  response_status,
  response_note,
  fulfilled
)
select
  ss.meeting_id,
  ss.ward_id,
  case ss.position
    when 1 then 'discourse_1'
    when 2 then 'discourse_2'
    when 3 then 'discourse_3'
  end as slot,
  ss.member_id,
  ss.topic,
  coalesce(ss.talk_response_status, 'pending')::text,
  ss.talk_response_note,
  ss.talk_delivered
from public.sacrament_speakers ss
where ss.position in (1, 2, 3)
on conflict (meeting_id, slot) do update set
  member_id = excluded.member_id,
  topic = excluded.topic,
  response_status = excluded.response_status,
  response_note = excluded.response_note,
  fulfilled = excluded.fulfilled,
  ward_id = excluded.ward_id;

-- Opening / closing from sacrament_meetings (member + engagement columns if present).
insert into public.sacrament_participations (
  meeting_id,
  ward_id,
  slot,
  member_id,
  topic,
  response_status,
  response_note,
  fulfilled
)
select
  sm.id,
  sm.ward_id,
  'opening_prayer',
  sm.opening_prayer_member_id,
  null,
  coalesce(sm.opening_prayer_response_status, 'pending')::text,
  sm.opening_prayer_response_note,
  sm.opening_prayer_fulfilled
from public.sacrament_meetings sm
where sm.opening_prayer_member_id is not null
on conflict (meeting_id, slot) do update set
  member_id = excluded.member_id,
  response_status = excluded.response_status,
  response_note = excluded.response_note,
  fulfilled = excluded.fulfilled,
  ward_id = excluded.ward_id;

insert into public.sacrament_participations (
  meeting_id,
  ward_id,
  slot,
  member_id,
  topic,
  response_status,
  response_note,
  fulfilled
)
select
  sm.id,
  sm.ward_id,
  'closing_prayer',
  sm.closing_prayer_member_id,
  null,
  coalesce(sm.closing_prayer_response_status, 'pending')::text,
  sm.closing_prayer_response_note,
  sm.closing_prayer_fulfilled
from public.sacrament_meetings sm
where sm.closing_prayer_member_id is not null
on conflict (meeting_id, slot) do update set
  member_id = excluded.member_id,
  response_status = excluded.response_status,
  response_note = excluded.response_note,
  fulfilled = excluded.fulfilled,
  ward_id = excluded.ward_id;

drop table if exists public.sacrament_speakers cascade;

alter table public.sacrament_meetings
  drop column if exists opening_prayer_member_id,
  drop column if exists closing_prayer_member_id,
  drop column if exists opening_prayer_response_status,
  drop column if exists opening_prayer_response_note,
  drop column if exists opening_prayer_fulfilled,
  drop column if exists closing_prayer_response_status,
  drop column if exists closing_prayer_response_note,
  drop column if exists closing_prayer_fulfilled;

comment on table public.sacrament_participations is
  'Per-meeting assignments: three discourses + opening/closing prayer. Member, topic (discourses), response, and fulfillment live here.';
