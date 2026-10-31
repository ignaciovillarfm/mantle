-- Near-match calling imports from Church “Members with Callings” PDF awaiting leadership approval.

create table public.calling_import_suggestions (
  id uuid primary key default gen_random_uuid(),
  ward_id uuid not null references public.wards (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  member_name_raw text not null,
  organization_raw text not null default '',
  calling_title_raw text not null,
  suggested_position_id uuid references public.calling_positions (id) on delete set null,
  suggested_position_title text,
  match_score real,
  sustained_date date,
  set_apart boolean not null default true,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index calling_import_suggestions_ward_status_idx
  on public.calling_import_suggestions (ward_id, status, created_at desc);

create trigger calling_import_suggestions_set_updated_at
before update on public.calling_import_suggestions
for each row execute function public.set_updated_at();

alter table public.calling_import_suggestions enable row level security;

create policy calling_import_suggestions_leadership
on public.calling_import_suggestions
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = calling_import_suggestions.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = calling_import_suggestions.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);
