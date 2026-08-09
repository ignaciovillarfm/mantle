-- Contact details the bishopric needs to actually reach whoever brings the bread

alter table public.sacrament_bread_assignments
  add column phone text,
  add column reminder_preference text;

-- Standing contact for members who need a ride to prepare the sacrament
create table public.sacrament_bread_ride_contacts (
  ward_id uuid primary key references public.wards (id) on delete cascade,
  name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger sacrament_bread_ride_contacts_set_updated_at
before update on public.sacrament_bread_ride_contacts
for each row execute function public.set_updated_at();

alter table public.sacrament_bread_ride_contacts enable row level security;

create policy sacrament_bread_ride_contacts_all_leadership_per_ward
on public.sacrament_bread_ride_contacts
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = sacrament_bread_ride_contacts.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = sacrament_bread_ride_contacts.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);
