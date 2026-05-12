-- Row Level Security (validate roles via user_roles + auth.uid(), not JWT claims)

-- profiles
alter table public.profiles enable row level security;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- No insert/update/delete policies for authenticated → denied

-- user_roles
alter table public.user_roles enable row level security;

create policy user_roles_select_authenticated
on public.user_roles
for select
to authenticated
using (true);

-- organizations
alter table public.organizations enable row level security;

create policy organizations_all_leadership
on public.organizations
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

-- members
alter table public.members enable row level security;

create policy members_all_leadership
on public.members
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

-- callings
alter table public.callings enable row level security;

create policy callings_all_leadership
on public.callings
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

-- calling_history
alter table public.calling_history enable row level security;

create policy calling_history_select_leadership
on public.calling_history
for select
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

create policy calling_history_insert_leadership
on public.calling_history
for insert
to authenticated
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

-- sacrament_meetings
alter table public.sacrament_meetings enable row level security;

create policy sacrament_meetings_all_leadership
on public.sacrament_meetings
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

-- sacrament_speakers
alter table public.sacrament_speakers enable row level security;

create policy sacrament_speakers_all_leadership
on public.sacrament_speakers
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

-- temple_recommends: bishop + counselor only (per expiring recommends function)
alter table public.temple_recommends enable row level security;

create policy temple_recommends_all_bishop_counselor
on public.temple_recommends
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('bishop', 'counselor')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('bishop', 'counselor')
  )
);

-- bishop_notes: bishop only
alter table public.bishop_notes enable row level security;

create policy bishop_notes_bishop_only
on public.bishop_notes
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'bishop'
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'bishop'
  )
);

-- audit_logs: no client access (service_role bypasses RLS for Edge Functions)
alter table public.audit_logs enable row level security;

revoke all on public.audit_logs from anon, authenticated;

-- feature_flags
alter table public.feature_flags enable row level security;

create policy feature_flags_select_leadership
on public.feature_flags
for select
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

create policy feature_flags_insert_bishop
on public.feature_flags
for insert
to authenticated
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'bishop'
  )
);

create policy feature_flags_update_bishop
on public.feature_flags
for update
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'bishop'
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'bishop'
  )
);

create policy feature_flags_delete_bishop
on public.feature_flags
for delete
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'bishop'
  )
);
