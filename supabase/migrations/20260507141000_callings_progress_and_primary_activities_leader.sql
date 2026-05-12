-- Add canonical Primary calling: "Primary Activities Leader"
insert into public.calling_positions (ward_id, title, sort_order)
select w.id, 'Primary Activities Leader', 470
from public.wards w
on conflict (ward_id, title) do update set sort_order = excluded.sort_order;

-- Ensure new wards also get this calling even if legacy seed function is used.
create or replace function public.seed_primary_activities_leader_for_ward(p_ward_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.calling_positions (ward_id, title, sort_order)
  values (p_ward_id, 'Primary Activities Leader', 470)
  on conflict (ward_id, title) do update set sort_order = excluded.sort_order;
end;
$$;

create or replace function public.trg_wards_seed_primary_activities_leader()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_primary_activities_leader_for_ward(new.id);
  return new;
end;
$$;

drop trigger if exists wards_seed_primary_activities_leader on public.wards;
create trigger wards_seed_primary_activities_leader
after insert on public.wards
for each row execute function public.trg_wards_seed_primary_activities_leader();

-- Spanish translation for the new canonical calling.
insert into public.calling_position_translations (calling_position_id, locale, title)
select cp.id, 'es', 'Líder de actividades'
from public.calling_positions cp
where cp.title = 'Primary Activities Leader'
on conflict (calling_position_id, locale) do update set title = excluded.title;

-- Normalize existing callings statuses to the new workflow:
-- Proposed -> Extended -> Accepted -> To Sustain -> Set Apart
update public.callings
set status = case
  when status = 'In Prayer' then 'Extended'
  when status = 'Stake Approval' then 'Accepted'
  when status = 'To Interview' then 'Accepted'
  else status
end
where status in ('In Prayer', 'Stake Approval', 'To Interview');

update public.calling_history
set old_status = case
  when old_status = 'In Prayer' then 'Extended'
  when old_status = 'Stake Approval' then 'Accepted'
  when old_status = 'To Interview' then 'Accepted'
  else old_status
end
where old_status in ('In Prayer', 'Stake Approval', 'To Interview');

update public.calling_history
set new_status = case
  when new_status = 'In Prayer' then 'Extended'
  when new_status = 'Stake Approval' then 'Accepted'
  when new_status = 'To Interview' then 'Accepted'
  else new_status
end
where new_status in ('In Prayer', 'Stake Approval', 'To Interview');
