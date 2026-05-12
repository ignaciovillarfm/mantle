create table if not exists public.sacrament_section_templates (
  template_key text not null,
  lang text not null check (lang in ('en', 'es')),
  body text not null,
  primary key (template_key, lang)
);

alter table public.sacrament_section_templates enable row level security;

drop policy if exists sacrament_section_templates_read_all on public.sacrament_section_templates;
create policy sacrament_section_templates_read_all
on public.sacrament_section_templates
for select
to authenticated
using (true);

insert into public.sacrament_section_templates (template_key, lang, body)
values
  ('ward.releases.default', 'es', '"Los siguientes hermanos han sido relevados de sus llamamientos: [Nombre] como [Cargo]
Quienes desen expresar agradecimiento por su servicio prestado, sirvanse hacerlo levantando la mano."'),
  ('ward.sustainings.default', 'es', '(Queremos pedir a los siguientes hermanos que se puedan poner de pie a medida que escuchen su nombre)

"Se propone que sostengamos a [Nombre] como [Cargo]. Todos los que estén a favor de sostenerlo(s), sírvanse hacerlo levantando la mano." [Breve Pausa]
"Opuestos, si los hay, sírvanse manifestarlo con la misma señal" [Breve Pausa]
"gracias, pueden tomar asiento..."'),
  ('ward.ordination.deacon', 'es', '“Se propone que [Nombre completo] reciba el Sacerdocio Aarónico y sea ordenado al oficio de diácono.”'),
  ('ward.ordination.teacher_priest', 'es', '“Se propone que [Nombre completo] sea avanzado al oficio de maestro/presbítero en el Sacerdocio Aarónico.”')
on conflict (template_key, lang) do update set body = excluded.body;
