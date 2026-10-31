-- Profile fields for member directory quick view / profile (from LCR member list imports).
alter table public.members
  add column if not exists gender text,
  add column if not exists birth_date date,
  add column if not exists phone text,
  add column if not exists email text;

alter table public.members
  drop constraint if exists members_gender_check;

alter table public.members
  add constraint members_gender_check
  check (gender is null or gender in ('F', 'M'));

comment on column public.members.gender is 'F or M from church member list when known';
comment on column public.members.birth_date is 'Birth date from church member list when known';
comment on column public.members.phone is 'Individual phone from church member list when known';
comment on column public.members.email is 'Individual email from church member list when known';
