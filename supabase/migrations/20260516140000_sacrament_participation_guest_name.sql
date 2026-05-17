-- Guest / stake speakers on discourse slots (not ward members).
alter table public.sacrament_participations
  add column if not exists guest_name text;

comment on column public.sacrament_participations.guest_name is
  'Display name when speaker is not a ward member (stake, high council, visitor).';
