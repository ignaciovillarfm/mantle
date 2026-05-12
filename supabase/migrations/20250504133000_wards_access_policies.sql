-- Ensure authenticated users can read only wards where they have a role

grant select on table public.wards to authenticated;

alter table public.wards enable row level security;

drop policy if exists wards_select_assigned on public.wards;
create policy wards_select_assigned
on public.wards
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = wards.id
  )
);
