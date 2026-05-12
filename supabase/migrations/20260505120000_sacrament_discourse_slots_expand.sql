-- Allow additional discourse participation slots (up to discourse_8).

alter table public.sacrament_participations
  drop constraint if exists sacrament_participations_slot_check;

alter table public.sacrament_participations
  add constraint sacrament_participations_slot_check
  check (
    slot in (
      'discourse_1',
      'discourse_2',
      'discourse_3',
      'discourse_4',
      'discourse_5',
      'discourse_6',
      'discourse_7',
      'discourse_8',
      'opening_prayer',
      'closing_prayer'
    )
  );
