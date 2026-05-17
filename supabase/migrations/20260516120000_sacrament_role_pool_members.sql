-- Ward-configured members eligible for sacrament meeting roles (e.g. substitute pianists).

create table if not exists public.sacrament_role_pool_members (
  id uuid primary key default gen_random_uuid(),
  ward_id uuid not null references public.wards (id) on delete cascade,
  role_key text not null check (role_key in ('presiding', 'conducting', 'chorister', 'organist')),
  member_id uuid not null references public.members (id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (ward_id, role_key, member_id)
);

create index if not exists sacrament_role_pool_members_ward_role_idx
  on public.sacrament_role_pool_members (ward_id, role_key, sort_order);

alter table public.sacrament_role_pool_members enable row level security;

create policy sacrament_role_pool_members_all_leadership_per_ward
on public.sacrament_role_pool_members
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = sacrament_role_pool_members.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = sacrament_role_pool_members.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);
