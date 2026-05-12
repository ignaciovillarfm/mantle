-- Seed for local / staging (run after migrations). Replace UUIDs as needed for auth-linked rows.

insert into public.wards (id, name)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sample Ward')
on conflict (id) do nothing;

insert into public.organizations (id, ward_id, name, type)
values
  ('11111111-1111-1111-1111-111111111101', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Relief Society', 'auxiliary'),
  ('11111111-1111-1111-1111-111111111102', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Elders Quorum', 'auxiliary'),
  ('11111111-1111-1111-1111-111111111103', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Young Women', 'auxiliary')
on conflict (id) do nothing;

insert into public.members (id, ward_id, name, organization_id, last_pulpit_date, is_youth)
values
  ('22222222-2222-2222-2222-222222222201', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jane Member', '11111111-1111-1111-1111-111111111101', '2024-06-01', false),
  ('22222222-2222-2222-2222-222222222202', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'John Speaker', '11111111-1111-1111-1111-111111111102', '2025-01-10', false),
  ('22222222-2222-2222-2222-222222222203', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Youth Speaker', '11111111-1111-1111-1111-111111111103', null, true),
  ('22222222-2222-2222-2222-222222222204', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Alex Clerk', '11111111-1111-1111-1111-111111111102', '2023-12-01', false)
on conflict (id) do nothing;

insert into public.sacrament_meetings (id, ward_id, date, theme)
values
  ('33333333-3333-3333-3333-333333333301', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 3, 'Faith')
on conflict (id) do nothing;

insert into public.sacrament_participations (meeting_id, ward_id, slot, member_id, topic, response_status)
values
  (
    '33333333-3333-3333-3333-333333333301',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'discourse_1',
    '22222222-2222-2222-2222-222222222201',
    'Charity',
    'pending'
  )
on conflict (meeting_id, slot) do nothing;

insert into public.temple_recommends (id, ward_id, member_id, expiration_date, last_interview_date)
values
  ('55555555-5555-5555-5555-555555555501', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222201', current_date + 30, current_date - 200),
  ('55555555-5555-5555-5555-555555555502', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222202', current_date + 45, null)
on conflict (id) do nothing;

insert into public.callings (id, ward_id, name, member_id, status, assigned_counselor)
values
  ('66666666-6666-6666-6666-666666666601', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Primary Teacher', '22222222-2222-2222-2222-222222222203', 'Proposed', null)
on conflict (id) do nothing;

insert into public.feature_flags (ward_id, key, enabled)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sacrament_mode', true)
on conflict (ward_id, key) do nothing;
