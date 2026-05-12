-- Ward management schema (no RLS in this migration)
-- Requires auth schema (Supabase)

create extension if not exists "pgcrypto";

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  session_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- user_roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('bishop', 'counselor', 'clerk')),
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role)
);

create index user_roles_user_id_idx on public.user_roles (user_id);

create trigger user_roles_set_updated_at
before update on public.user_roles
for each row execute function public.set_updated_at();

-- organizations
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'organization',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

-- members
create table public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  last_pulpit_date date,
  is_youth boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index members_organization_id_idx on public.members (organization_id);
create index members_last_pulpit_date_idx on public.members (last_pulpit_date);

create trigger members_set_updated_at
before update on public.members
for each row execute function public.set_updated_at();

-- callings
create table public.callings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  member_id uuid not null references public.members (id) on delete cascade,
  status text not null default 'Proposed',
  assigned_counselor uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index callings_member_id_idx on public.callings (member_id);
create index callings_assigned_counselor_idx on public.callings (assigned_counselor);

create trigger callings_set_updated_at
before update on public.callings
for each row execute function public.set_updated_at();

-- calling_history
create table public.calling_history (
  id uuid primary key default gen_random_uuid(),
  calling_id uuid not null references public.callings (id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index calling_history_calling_id_idx on public.calling_history (calling_id);

create trigger calling_history_set_updated_at
before update on public.calling_history
for each row execute function public.set_updated_at();

-- sacrament_meetings
create table public.sacrament_meetings (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  conducting_id uuid references public.members (id) on delete set null,
  theme text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sacrament_meetings_date_idx on public.sacrament_meetings (date);

create trigger sacrament_meetings_set_updated_at
before update on public.sacrament_meetings
for each row execute function public.set_updated_at();

-- sacrament_speakers
create table public.sacrament_speakers (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.sacrament_meetings (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  speaker_type text not null default 'speaker',
  topic text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sacrament_speakers_meeting_id_idx on public.sacrament_speakers (meeting_id);
create index sacrament_speakers_member_id_idx on public.sacrament_speakers (member_id);

create trigger sacrament_speakers_set_updated_at
before update on public.sacrament_speakers
for each row execute function public.set_updated_at();

-- temple_recommends
create table public.temple_recommends (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  expiration_date date not null,
  last_interview_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index temple_recommends_member_id_idx on public.temple_recommends (member_id);
create index temple_recommends_expiration_date_idx on public.temple_recommends (expiration_date);

create trigger temple_recommends_set_updated_at
before update on public.temple_recommends
for each row execute function public.set_updated_at();

-- bishop_notes (ciphertext only at rest)
create table public.bishop_notes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  encrypted_note_text text not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bishop_notes_member_id_idx on public.bishop_notes (member_id);
create index bishop_notes_expires_at_idx on public.bishop_notes (expires_at);

create trigger bishop_notes_set_updated_at
before update on public.bishop_notes
for each row execute function public.set_updated_at();

-- audit_logs (append-only; RLS + grants in next migration)
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  table_name text,
  record_id uuid,
  created_at timestamptz not null default now()
);

create index audit_logs_user_created_idx on public.audit_logs (user_id, created_at desc);

-- feature flags (production tooling)
create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger feature_flags_set_updated_at
before update on public.feature_flags
for each row execute function public.set_updated_at();

comment on table public.audit_logs is 'Append-only audit trail; no updates/deletes from app roles.';
