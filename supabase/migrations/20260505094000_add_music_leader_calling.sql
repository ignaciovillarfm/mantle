-- Add missing canonical calling: Music Leader.
-- Keeps existing wards and future wards aligned.

insert into public.calling_positions (ward_id, title, sort_order)
select w.id, 'Music Leader', 715
from public.wards w
on conflict (ward_id, title)
do update set sort_order = excluded.sort_order;

create or replace function public.seed_music_leader_for_ward(p_ward_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.calling_positions (ward_id, title, sort_order)
  values (p_ward_id, 'Music Leader', 715)
  on conflict (ward_id, title)
  do update set sort_order = excluded.sort_order;
end;
$$;

create or replace function public.trg_wards_seed_music_leader()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_music_leader_for_ward(new.id);
  return new;
end;
$$;

drop trigger if exists wards_seed_music_leader on public.wards;
create trigger wards_seed_music_leader
after insert on public.wards
for each row execute function public.trg_wards_seed_music_leader();
