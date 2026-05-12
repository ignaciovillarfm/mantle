-- Opening/closing prayer: same engagement model as discourse slots (Members + Sacrament).

alter table public.sacrament_meetings
  add column if not exists opening_prayer_response_status text not null default 'pending'
    constraint sacrament_meetings_opening_prayer_response_status_check
    check (opening_prayer_response_status in ('pending', 'accepted', 'declined')),
  add column if not exists opening_prayer_response_note text,
  add column if not exists opening_prayer_fulfilled boolean,
  add column if not exists closing_prayer_response_status text not null default 'pending'
    constraint sacrament_meetings_closing_prayer_response_status_check
    check (closing_prayer_response_status in ('pending', 'accepted', 'declined')),
  add column if not exists closing_prayer_response_note text,
  add column if not exists closing_prayer_fulfilled boolean;

comment on column public.sacrament_meetings.opening_prayer_response_status is 'Response to being asked to offer the opening prayer.';
comment on column public.sacrament_meetings.opening_prayer_fulfilled is 'Whether they actually offered the prayer that Sunday; null if unknown.';
comment on column public.sacrament_meetings.closing_prayer_response_status is 'Response to being asked to offer the closing prayer.';
comment on column public.sacrament_meetings.closing_prayer_fulfilled is 'Whether they actually offered the closing prayer that Sunday; null if unknown.';
