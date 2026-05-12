-- Track discourse invitation response and follow-through (Members tab + Sacrament form).

alter table public.sacrament_speakers
  add column if not exists talk_response_status text not null default 'pending'
    constraint sacrament_speakers_talk_response_status_check
    check (talk_response_status in ('pending', 'accepted', 'declined')),
  add column if not exists talk_response_note text,
  add column if not exists talk_delivered boolean;

comment on column public.sacrament_speakers.talk_response_status is 'Member response to being assigned this discourse (sacrament slot).';
comment on column public.sacrament_speakers.talk_response_note is 'Reason for declining or other pastoral note.';
comment on column public.sacrament_speakers.talk_delivered is 'Whether they actually spoke that Sunday; null if unknown or meeting not yet held.';

create index if not exists sacrament_speakers_member_ward_idx
  on public.sacrament_speakers (member_id, ward_id)
  where member_id is not null;
