-- Ward leadership invites (app access, not congregation members)

create table public.ward_invites (
  id uuid primary key default gen_random_uuid(),
  ward_id uuid not null references public.wards (id) on delete cascade,
  email text not null,
  role text not null check (role in ('bishop', 'counselor', 'clerk')),
  invited_by uuid not null references public.profiles (id) on delete restrict,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ward_invites_ward_id_idx on public.ward_invites (ward_id);
create index ward_invites_email_lower_idx on public.ward_invites (lower(email));
create index ward_invites_status_idx on public.ward_invites (status);

create unique index ward_invites_pending_ward_email_uidx
  on public.ward_invites (ward_id, lower(email))
  where status = 'pending';

create trigger ward_invites_set_updated_at
before update on public.ward_invites
for each row execute function public.set_updated_at();

alter table public.ward_invites enable row level security;

-- Leadership on the ward can read invites for that ward
create policy ward_invites_select_ward_leadership
on public.ward_invites
for select
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = ward_invites.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);
