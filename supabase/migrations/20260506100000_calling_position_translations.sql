-- Localized labels for calling presets (used by sacrament-only UX).
create table if not exists public.calling_position_translations (
  id uuid primary key default gen_random_uuid(),
  calling_position_id uuid not null references public.calling_positions (id) on delete cascade,
  locale text not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calling_position_translations_locale_chk check (locale in ('en', 'es')),
  constraint calling_position_translations_title_trim check (char_length(trim(title)) > 0),
  constraint calling_position_translations_unique unique (calling_position_id, locale)
);

create index if not exists calling_position_translations_calling_idx
  on public.calling_position_translations (calling_position_id, locale);

drop trigger if exists calling_position_translations_set_updated_at on public.calling_position_translations;
create trigger calling_position_translations_set_updated_at
before update on public.calling_position_translations
for each row execute function public.set_updated_at();

alter table public.calling_position_translations enable row level security;

drop policy if exists calling_position_translations_all_leadership_per_ward on public.calling_position_translations;
create policy calling_position_translations_all_leadership_per_ward
on public.calling_position_translations
for all
to authenticated
using (
  exists (
    select 1
    from public.calling_positions cp
    join public.user_roles ur on ur.ward_id = cp.ward_id
    where cp.id = calling_position_translations.calling_position_id
      and ur.user_id = auth.uid()
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
)
with check (
  exists (
    select 1
    from public.calling_positions cp
    join public.user_roles ur on ur.ward_id = cp.ward_id
    where cp.id = calling_position_translations.calling_position_id
      and ur.user_id = auth.uid()
      and ur.role in ('bishop', 'counselor', 'clerk')
  )
);

comment on table public.calling_position_translations is
  'Localized calling preset labels by locale; sacrament UI can render Spanish while preserving canonical English calling_positions titles.';

with es_map(en_title, es_title) as (
  values
    ('Bishop', 'Obispo'),
    ('First Counselor in the Bishopric', 'Primer Consejero del Obispado'),
    ('Second Counselor in the Bishopric', 'Segundo Consejero del Obispado'),
    ('Ward Clerk', 'Secretario del Barrio'),
    ('Assistant Ward Clerk', 'Secretario Auxiliar del Barrio'),
    ('Ward Executive Secretary', 'Secretario Ejecutivo del Barrio'),
    ('Relief Society President', 'Presidenta de la Sociedad de Socorro'),
    ('First Counselor in the Relief Society Presidency', 'Primera Consejera de la Presidencia de la Sociedad de Socorro'),
    ('Second Counselor in the Relief Society Presidency', 'Segunda Consejera de la Presidencia de la Sociedad de Socorro'),
    ('Relief Society Secretary', 'Secretaria de la Sociedad de Socorro'),
    ('Relief Society Teacher', 'Maestra de la Sociedad de Socorro'),
    ('Relief Society Ministering Coordinator', 'Coordinadora de Ministración de la Sociedad de Socorro'),
    ('Elders Quorum President', 'Presidente del Cuórum de Élderes'),
    ('First Counselor in the Elders Quorum Presidency', 'Primer Consejero de la Presidencia del Cuórum de Élderes'),
    ('Second Counselor in the Elders Quorum Presidency', 'Segundo Consejero de la Presidencia del Cuórum de Élderes'),
    ('Elders Quorum Secretary', 'Secretario del Cuórum de Élderes'),
    ('Elders Quorum Teacher', 'Maestro del Cuórum de Élderes'),
    ('Elders Quorum Ministering Coordinator', 'Coordinador de Ministración del Cuórum de Élderes'),
    ('Young Women President', 'Presidenta de las Mujeres Jóvenes'),
    ('First Counselor in the Young Women Presidency', 'Primera Consejera de la Presidencia de Mujeres Jóvenes'),
    ('Second Counselor in the Young Women Presidency', 'Segunda Consejera de la Presidencia de Mujeres Jóvenes'),
    ('Young Women Secretary', 'Secretaria de Mujeres Jóvenes'),
    ('Young Women Adviser', 'Asesora de Mujeres Jóvenes'),
    ('Young Women Class President', 'Presidenta de Clase de Mujeres Jóvenes'),
    ('Young Women Class Counselor', 'Consejera de Clase de Mujeres Jóvenes'),
    ('Young Women Class Secretary', 'Secretaria de Clase de Mujeres Jóvenes'),
    ('Primary President', 'Presidenta de la Primaria'),
    ('First Counselor in the Primary Presidency', 'Primer Consejero de la Presidencia de la Primaria'),
    ('Second Counselor in the Primary Presidency', 'Segundo Consejero de la Presidencia de la Primaria'),
    ('Primary Secretary', 'Secretaria de la Primaria'),
    ('Primary Teacher', 'Maestro(a) de la Primaria'),
    ('Primary Music Leader', 'Director(a) de Música de la Primaria'),
    ('Primary Pianist', 'Pianista de la Primaria'),
    ('Sunday School President', 'Presidente de la Escuela Dominical'),
    ('First Counselor in the Sunday School Presidency', 'Primer Consejero de la Presidencia de la Escuela Dominical'),
    ('Second Counselor in the Sunday School Presidency', 'Segundo Consejero de la Presidencia de la Escuela Dominical'),
    ('Sunday School Secretary', 'Secretario(a) de la Escuela Dominical'),
    ('Sunday School Teacher', 'Maestro(a) de la Escuela Dominical'),
    ('Priests Quorum Adviser', 'Asesor del Cuórum de Presbíteros'),
    ('Teachers Quorum Adviser', 'Asesor del Cuórum de Maestros'),
    ('Deacons Quorum Adviser', 'Asesor del Cuórum de Diáconos'),
    ('Ward Music Chairman', 'Presidente de Música del Barrio'),
    ('Ward Music Director', 'Director de Música del Barrio'),
    ('Ward Pianist', 'Pianista del Barrio'),
    ('Ward Organist', 'Organista del Barrio'),
    ('Choir Director', 'Director del Coro'),
    ('Choir Accompanist', 'Acompañante del Coro'),
    ('Activities Committee Chair', 'Presidente del Comité de Actividades'),
    ('Activities Committee Member', 'Miembro del Comité de Actividades'),
    ('Ward Mission Leader', 'Líder Misional del Barrio'),
    ('Ward Missionary', 'Misionero(a) de Barrio'),
    ('Temple and Family History Leader', 'Líder de Templo e Historia Familiar'),
    ('Temple and Family History Consultant', 'Consultor(a) de Templo e Historia Familiar'),
    ('Ward Technology Specialist', 'Especialista de Tecnología del Barrio'),
    ('Ward Emergency Preparedness Coordinator', 'Coordinador de Preparación para Emergencias del Barrio'),
    ('Ward Bulletin Specialist', 'Especialista del Boletín del Barrio'),
    ('Communication Specialist', 'Especialista de Comunicación'),
    ('Young Single Adult Representative', 'Representante de Adultos Jóvenes Solteros'),
    ('Single Adult Representative', 'Representante de Adultos Solteros'),
    ('Self-Reliance Specialist', 'Especialista de Autosuficiencia'),
    ('Employment Specialist', 'Especialista de Empleo'),
    ('Addiction Recovery Worker', 'Líder de Recuperación de Adicciones'),
    ('Ward History Specialist', 'Especialista de Historia del Barrio'),
    ('Seminary Specialist', 'Especialista de Seminario'),
    ('Music Adviser', 'Asesor de Música'),
    ('Ward Gardener', 'Jardinero del Barrio'),
    ('Outdoor Adventure Specialist', 'Especialista de Actividades al Aire Libre'),
    ('Youth Camp Leader', 'Líder de Campamento de Jóvenes'),
    ('Youth Camp Committee Member', 'Miembro del Comité de Campamento de Jóvenes'),
    ('Quorum Presidency Member', 'Miembro de Presidencia de Cuórum'),
    ('Class Presidency Member', 'Miembro de Presidencia de Clase')
)
insert into public.calling_position_translations (calling_position_id, locale, title)
select cp.id, 'es', em.es_title
from public.calling_positions cp
join es_map em on em.en_title = cp.title
on conflict (calling_position_id, locale)
do update set title = excluded.title;

create or replace function public.trg_calling_positions_seed_es_translation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.calling_position_translations (calling_position_id, locale, title)
  select new.id, 'es', em.es_title
  from (
    values
      ('Bishop', 'Obispo'),
      ('First Counselor in the Bishopric', 'Primer Consejero del Obispado'),
      ('Second Counselor in the Bishopric', 'Segundo Consejero del Obispado'),
      ('Ward Clerk', 'Secretario del Barrio'),
      ('Assistant Ward Clerk', 'Secretario Auxiliar del Barrio'),
      ('Ward Executive Secretary', 'Secretario Ejecutivo del Barrio'),
      ('Relief Society President', 'Presidenta de la Sociedad de Socorro'),
      ('First Counselor in the Relief Society Presidency', 'Primera Consejera de la Presidencia de la Sociedad de Socorro'),
      ('Second Counselor in the Relief Society Presidency', 'Segunda Consejera de la Presidencia de la Sociedad de Socorro'),
      ('Relief Society Secretary', 'Secretaria de la Sociedad de Socorro'),
      ('Relief Society Teacher', 'Maestra de la Sociedad de Socorro'),
      ('Relief Society Ministering Coordinator', 'Coordinadora de Ministración de la Sociedad de Socorro'),
      ('Elders Quorum President', 'Presidente del Cuórum de Élderes'),
      ('First Counselor in the Elders Quorum Presidency', 'Primer Consejero de la Presidencia del Cuórum de Élderes'),
      ('Second Counselor in the Elders Quorum Presidency', 'Segundo Consejero de la Presidencia del Cuórum de Élderes'),
      ('Elders Quorum Secretary', 'Secretario del Cuórum de Élderes'),
      ('Elders Quorum Teacher', 'Maestro del Cuórum de Élderes'),
      ('Elders Quorum Ministering Coordinator', 'Coordinador de Ministración del Cuórum de Élderes'),
      ('Young Women President', 'Presidenta de las Mujeres Jóvenes'),
      ('First Counselor in the Young Women Presidency', 'Primera Consejera de la Presidencia de Mujeres Jóvenes'),
      ('Second Counselor in the Young Women Presidency', 'Segunda Consejera de la Presidencia de Mujeres Jóvenes'),
      ('Young Women Secretary', 'Secretaria de Mujeres Jóvenes'),
      ('Young Women Adviser', 'Asesora de Mujeres Jóvenes'),
      ('Young Women Class President', 'Presidenta de Clase de Mujeres Jóvenes'),
      ('Young Women Class Counselor', 'Consejera de Clase de Mujeres Jóvenes'),
      ('Young Women Class Secretary', 'Secretaria de Clase de Mujeres Jóvenes'),
      ('Primary President', 'Presidenta de la Primaria'),
      ('First Counselor in the Primary Presidency', 'Primer Consejero de la Presidencia de la Primaria'),
      ('Second Counselor in the Primary Presidency', 'Segundo Consejero de la Presidencia de la Primaria'),
      ('Primary Secretary', 'Secretaria de la Primaria'),
      ('Primary Teacher', 'Maestro(a) de la Primaria'),
      ('Primary Music Leader', 'Director(a) de Música de la Primaria'),
      ('Primary Pianist', 'Pianista de la Primaria'),
      ('Sunday School President', 'Presidente de la Escuela Dominical'),
      ('First Counselor in the Sunday School Presidency', 'Primer Consejero de la Presidencia de la Escuela Dominical'),
      ('Second Counselor in the Sunday School Presidency', 'Segundo Consejero de la Presidencia de la Escuela Dominical'),
      ('Sunday School Secretary', 'Secretario(a) de la Escuela Dominical'),
      ('Sunday School Teacher', 'Maestro(a) de la Escuela Dominical'),
      ('Priests Quorum Adviser', 'Asesor del Cuórum de Presbíteros'),
      ('Teachers Quorum Adviser', 'Asesor del Cuórum de Maestros'),
      ('Deacons Quorum Adviser', 'Asesor del Cuórum de Diáconos'),
      ('Ward Music Chairman', 'Presidente de Música del Barrio'),
      ('Ward Music Director', 'Director de Música del Barrio'),
      ('Ward Pianist', 'Pianista del Barrio'),
      ('Ward Organist', 'Organista del Barrio'),
      ('Choir Director', 'Director del Coro'),
      ('Choir Accompanist', 'Acompañante del Coro'),
      ('Activities Committee Chair', 'Presidente del Comité de Actividades'),
      ('Activities Committee Member', 'Miembro del Comité de Actividades'),
      ('Ward Mission Leader', 'Líder Misional del Barrio'),
      ('Ward Missionary', 'Misionero(a) de Barrio'),
      ('Temple and Family History Leader', 'Líder de Templo e Historia Familiar'),
      ('Temple and Family History Consultant', 'Consultor(a) de Templo e Historia Familiar'),
      ('Ward Technology Specialist', 'Especialista de Tecnología del Barrio'),
      ('Ward Emergency Preparedness Coordinator', 'Coordinador de Preparación para Emergencias del Barrio'),
      ('Ward Bulletin Specialist', 'Especialista del Boletín del Barrio'),
      ('Communication Specialist', 'Especialista de Comunicación'),
      ('Young Single Adult Representative', 'Representante de Adultos Jóvenes Solteros'),
      ('Single Adult Representative', 'Representante de Adultos Solteros'),
      ('Self-Reliance Specialist', 'Especialista de Autosuficiencia'),
      ('Employment Specialist', 'Especialista de Empleo'),
      ('Addiction Recovery Worker', 'Líder de Recuperación de Adicciones'),
      ('Ward History Specialist', 'Especialista de Historia del Barrio'),
      ('Seminary Specialist', 'Especialista de Seminario'),
      ('Music Adviser', 'Asesor de Música'),
      ('Ward Gardener', 'Jardinero del Barrio'),
      ('Outdoor Adventure Specialist', 'Especialista de Actividades al Aire Libre'),
      ('Youth Camp Leader', 'Líder de Campamento de Jóvenes'),
      ('Youth Camp Committee Member', 'Miembro del Comité de Campamento de Jóvenes'),
      ('Quorum Presidency Member', 'Miembro de Presidencia de Cuórum'),
      ('Class Presidency Member', 'Miembro de Presidencia de Clase')
  ) em(en_title, es_title)
  where new.title = em.en_title
  on conflict (calling_position_id, locale) do nothing;
  return new;
end;
$$;

drop trigger if exists calling_positions_seed_es_translation on public.calling_positions;
create trigger calling_positions_seed_es_translation
after insert on public.calling_positions
for each row execute function public.trg_calling_positions_seed_es_translation();
