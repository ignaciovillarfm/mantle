-- Ward-level overrides for sacrament program section texts.
-- Global defaults remain in sacrament_section_templates; other wards are unaffected.

create table if not exists public.ward_sacrament_section_templates (
  ward_id uuid not null references public.wards (id) on delete cascade,
  template_key text not null,
  lang text not null check (lang in ('en', 'es')),
  body text not null,
  updated_at timestamptz not null default now(),
  primary key (ward_id, template_key, lang)
);

create index if not exists ward_sacrament_section_templates_ward_idx
  on public.ward_sacrament_section_templates (ward_id);

alter table public.ward_sacrament_section_templates enable row level security;

drop policy if exists ward_sacrament_section_templates_select_members on public.ward_sacrament_section_templates;
create policy ward_sacrament_section_templates_select_members
on public.ward_sacrament_section_templates
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = ward_sacrament_section_templates.ward_id
  )
);

drop policy if exists ward_sacrament_section_templates_write_leadership on public.ward_sacrament_section_templates;
create policy ward_sacrament_section_templates_write_leadership
on public.ward_sacrament_section_templates
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = ward_sacrament_section_templates.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.ward_id = ward_sacrament_section_templates.ward_id
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

-- Seed missing English defaults on the global catalog (ward overrides still win).
insert into public.sacrament_section_templates (template_key, lang, body)
values
  (
    'ward.releases.default',
    'en',
    'The following have been released from their callings: [Name] as [Calling]. Those who wish to express appreciation for their service may do so by the uplifted hand.'
  ),
  (
    'ward.sustainings.default',
    'en',
    '(We invite the following to stand as their names are read)

"It is proposed that we sustain [Name] as [Calling]. Those in favor may manifest it by the uplifted hand." [Brief pause]
"Those opposed, if any, may manifest it." [Brief pause]
"Thank you; you may be seated."'
  ),
  (
    'ward.ordination.deacon',
    'en',
    '"It is proposed that [Full name] receive the Aaronic Priesthood and be ordained to the office of a deacon."'
  ),
  (
    'ward.ordination.teacher_priest',
    'en',
    '"It is proposed that [Full name] be advanced to the office of a teacher/priest in the Aaronic Priesthood."'
  )
on conflict (template_key, lang) do nothing;
