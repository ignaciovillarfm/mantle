-- Which youth teaches the Sunday class, per quorum / class

create table public.youth_class_assignments (
  id uuid primary key default gen_random_uuid(),
  ward_id uuid not null references public.wards (id) on delete cascade,
  sunday_date date not null,
  quorum text not null default 'combined' check (
    quorum in ('deacons', 'teachers', 'priests', 'combined', 'young_women')
  ),
  member_id uuid references public.members (id) on delete set null,
  teacher_name text,
  topic text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ward_id, sunday_date, quorum)
);

create index youth_class_assignments_ward_date_idx
  on public.youth_class_assignments (ward_id, sunday_date);

create trigger youth_class_assignments_set_updated_at
before update on public.youth_class_assignments
for each row execute function public.set_updated_at();

alter table public.youth_class_assignments enable row level security;

create policy youth_class_assignments_all_leadership_per_ward
on public.youth_class_assignments
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = youth_class_assignments.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = youth_class_assignments.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);
