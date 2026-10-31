-- Whether more than one member may hold this calling at once in a ward.
-- Sourced from General Handbook patterns (30. Callings; organization chapters):
-- presidencies/clerks/leaders are typically one; teachers/missionaries/consultants/advisers may be many.

alter table public.calling_positions
  add column if not exists allows_multiple boolean not null default false;

comment on column public.calling_positions.allows_multiple is
  'True when the ward may have more than one person Set Apart in this calling at the same time (e.g. Primary Teacher). False for unique seats (e.g. Bishop, organization president).';

-- Multi-holder callings (Handbook: additional teachers/missionaries/consultants/assistants as needed)
update public.calling_positions
set allows_multiple = true
where title in (
  'Assistant Ward Clerk',
  'Relief Society Teacher',
  'Relief Society Ministering Coordinator',
  'Elders Quorum Teacher',
  'Elders Quorum Ministering Coordinator',
  'Young Women Adviser',
  'Young Women Class President',
  'Young Women Class Counselor',
  'Young Women Class Secretary',
  'Primary Teacher',
  'Primary Pianist',
  'Primary Activities Leader',
  'Sunday School Teacher',
  'Ward Pianist',
  'Ward Organist',
  'Choir Director',
  'Choir Accompanist',
  'Music Leader',
  'Activities Committee Member',
  'Ward Missionary',
  'Temple and Family History Consultant',
  'Ward Technology Specialist',
  'Communication Specialist',
  'Self-Reliance Specialist',
  'Employment Specialist',
  'Addiction Recovery Worker',
  'Ward Gardener',
  'Outdoor Adventure Specialist',
  'Youth Camp Leader',
  'Youth Camp Committee Member',
  'Quorum Presidency Member',
  'Class Presidency Member'
);

-- Unique seats stay false (default): Bishop, counselors, presidents, secretaries, clerks (one),
-- executive secretary, music chairman/director, mission/TFH leaders, advisers (one per quorum), etc.

create or replace function public.seed_calling_positions_for_ward(p_ward_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.calling_positions (ward_id, title, sort_order, allows_multiple)
  values
    (p_ward_id, 'Bishop', 10, false),
    (p_ward_id, 'First Counselor in the Bishopric', 20, false),
    (p_ward_id, 'Second Counselor in the Bishopric', 30, false),
    (p_ward_id, 'Ward Clerk', 40, false),
    (p_ward_id, 'Assistant Ward Clerk', 50, true),
    (p_ward_id, 'Ward Executive Secretary', 60, false),
    (p_ward_id, 'Relief Society President', 100, false),
    (p_ward_id, 'First Counselor in the Relief Society Presidency', 110, false),
    (p_ward_id, 'Second Counselor in the Relief Society Presidency', 120, false),
    (p_ward_id, 'Relief Society Secretary', 130, false),
    (p_ward_id, 'Relief Society Teacher', 140, true),
    (p_ward_id, 'Relief Society Ministering Coordinator', 150, true),
    (p_ward_id, 'Elders Quorum President', 200, false),
    (p_ward_id, 'First Counselor in the Elders Quorum Presidency', 210, false),
    (p_ward_id, 'Second Counselor in the Elders Quorum Presidency', 220, false),
    (p_ward_id, 'Elders Quorum Secretary', 230, false),
    (p_ward_id, 'Elders Quorum Teacher', 240, true),
    (p_ward_id, 'Elders Quorum Ministering Coordinator', 250, true),
    (p_ward_id, 'Young Women President', 300, false),
    (p_ward_id, 'First Counselor in the Young Women Presidency', 310, false),
    (p_ward_id, 'Second Counselor in the Young Women Presidency', 320, false),
    (p_ward_id, 'Young Women Secretary', 330, false),
    (p_ward_id, 'Young Women Adviser', 340, true),
    (p_ward_id, 'Young Women Class President', 350, true),
    (p_ward_id, 'Young Women Class Counselor', 360, true),
    (p_ward_id, 'Young Women Class Secretary', 370, true),
    (p_ward_id, 'Primary President', 400, false),
    (p_ward_id, 'First Counselor in the Primary Presidency', 410, false),
    (p_ward_id, 'Second Counselor in the Primary Presidency', 420, false),
    (p_ward_id, 'Primary Secretary', 430, false),
    (p_ward_id, 'Primary Teacher', 440, true),
    (p_ward_id, 'Primary Music Leader', 450, false),
    (p_ward_id, 'Primary Pianist', 460, true),
    (p_ward_id, 'Primary Activities Leader', 470, true),
    (p_ward_id, 'Sunday School President', 500, false),
    (p_ward_id, 'First Counselor in the Sunday School Presidency', 510, false),
    (p_ward_id, 'Second Counselor in the Sunday School Presidency', 520, false),
    (p_ward_id, 'Sunday School Secretary', 530, false),
    (p_ward_id, 'Sunday School Teacher', 540, true),
    (p_ward_id, 'Priests Quorum Adviser', 600, false),
    (p_ward_id, 'Teachers Quorum Adviser', 610, false),
    (p_ward_id, 'Deacons Quorum Adviser', 620, false),
    (p_ward_id, 'Ward Music Chairman', 700, false),
    (p_ward_id, 'Ward Music Director', 710, false),
    (p_ward_id, 'Music Leader', 715, true),
    (p_ward_id, 'Ward Pianist', 720, true),
    (p_ward_id, 'Ward Organist', 730, true),
    (p_ward_id, 'Choir Director', 740, true),
    (p_ward_id, 'Choir Accompanist', 750, true),
    (p_ward_id, 'Activities Committee Chair', 760, false),
    (p_ward_id, 'Activities Committee Member', 770, true),
    (p_ward_id, 'Ward Mission Leader', 800, false),
    (p_ward_id, 'Ward Missionary', 810, true),
    (p_ward_id, 'Temple and Family History Leader', 820, false),
    (p_ward_id, 'Temple and Family History Consultant', 830, true),
    (p_ward_id, 'Ward Technology Specialist', 840, true),
    (p_ward_id, 'Ward Emergency Preparedness Coordinator', 850, false),
    (p_ward_id, 'Ward Bulletin Specialist', 860, false),
    (p_ward_id, 'Communication Specialist', 870, true),
    (p_ward_id, 'Young Single Adult Representative', 880, false),
    (p_ward_id, 'Single Adult Representative', 890, false),
    (p_ward_id, 'Self-Reliance Specialist', 900, true),
    (p_ward_id, 'Employment Specialist', 910, true),
    (p_ward_id, 'Addiction Recovery Worker', 920, true),
    (p_ward_id, 'Ward History Specialist', 930, false),
    (p_ward_id, 'Seminary Specialist', 940, false),
    (p_ward_id, 'Music Adviser', 950, false),
    (p_ward_id, 'Ward Gardener', 960, true),
    (p_ward_id, 'Outdoor Adventure Specialist', 970, true),
    (p_ward_id, 'Youth Camp Leader', 980, true),
    (p_ward_id, 'Youth Camp Committee Member', 990, true),
    (p_ward_id, 'Quorum Presidency Member', 1000, true),
    (p_ward_id, 'Class Presidency Member', 1010, true)
  on conflict (ward_id, title) do update
    set sort_order = excluded.sort_order,
        allows_multiple = excluded.allows_multiple;
end;
$$;
