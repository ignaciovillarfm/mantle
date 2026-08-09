-- Who brings the sacrament bread each Sunday

create table public.sacrament_bread_assignments (
  id uuid primary key default gen_random_uuid(),
  ward_id uuid not null references public.wards (id) on delete cascade,
  sunday_date date not null,
  member_id uuid references public.members (id) on delete set null,
  assigned_to text,
  notes text,
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ward_id, sunday_date)
);

create index sacrament_bread_assignments_ward_date_idx
  on public.sacrament_bread_assignments (ward_id, sunday_date);

create trigger sacrament_bread_assignments_set_updated_at
before update on public.sacrament_bread_assignments
for each row execute function public.set_updated_at();

alter table public.sacrament_bread_assignments enable row level security;

create policy sacrament_bread_assignments_all_leadership_per_ward
on public.sacrament_bread_assignments
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = sacrament_bread_assignments.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = sacrament_bread_assignments.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);
