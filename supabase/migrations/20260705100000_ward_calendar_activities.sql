-- Ward calendar activities (events, meetings, service projects, etc.)

create table public.ward_calendar_activities (
  id uuid primary key default gen_random_uuid(),
  ward_id uuid not null references public.wards (id) on delete cascade,
  activity_date date not null,
  title text not null,
  notes text,
  location text,
  start_time time,
  end_time time,
  category text not null default 'activity' check (
    category in ('activity', 'meeting', 'service', 'youth', 'temple', 'missionary', 'other')
  ),
  organizer_member_id uuid references public.members (id) on delete set null,
  include_in_sacrament_program boolean not null default false,
  announcement_text text,
  last_synced_announcement_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ward_calendar_activities_ward_date_idx
  on public.ward_calendar_activities (ward_id, activity_date);

create trigger ward_calendar_activities_set_updated_at
before update on public.ward_calendar_activities
for each row execute function public.set_updated_at();

alter table public.ward_calendar_activities enable row level security;

create policy ward_calendar_activities_all_leadership_per_ward
on public.ward_calendar_activities
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = ward_calendar_activities.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = ward_calendar_activities.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);
