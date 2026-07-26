-- Advance notice for sacrament announcements synced from calendar activities

alter table public.ward_calendar_activities
  add column if not exists announcement_weeks_before smallint not null default 1
    check (announcement_weeks_before >= 1 and announcement_weeks_before <= 3),
  add column if not exists last_synced_sacrament_weeks jsonb not null default '[]'::jsonb;
