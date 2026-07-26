-- Aaronic priesthood youth activities (separate from ward calendar)

create table public.youth_activities (
  id uuid primary key default gen_random_uuid(),
  ward_id uuid not null references public.wards (id) on delete cascade,
  activity_date date not null,
  end_date date,
  title text not null,
  quorum text not null default 'combined' check (
    quorum in ('deacons', 'teachers', 'priests', 'combined', 'stake')
  ),
  youth_in_charge text,
  youth_member_id uuid references public.members (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint youth_activities_end_date_ok check (
    end_date is null or end_date >= activity_date
  )
);

create index youth_activities_ward_date_idx
  on public.youth_activities (ward_id, activity_date);

create trigger youth_activities_set_updated_at
before update on public.youth_activities
for each row execute function public.set_updated_at();

alter table public.youth_activities enable row level security;

create policy youth_activities_all_leadership_per_ward
on public.youth_activities
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = youth_activities.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = youth_activities.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);
