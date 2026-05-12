insert into public.sacrament_section_templates (template_key, lang, body)
values
  (
    'ward.new_members.default',
    'es',
    'Los siguientes hermanos han movido sus registros a nuestro barrio [Familia y Nombres]. Los que deseen expresar un voto de bienvenida al barrio, pueden hacerlo levantando la mano'
  ),
  (
    'ward.new_members.default',
    'en',
    'The following members have moved their records into our ward: [Family and names]. Those who wish to welcome them to the ward may do so by the uplifted hand.'
  )
on conflict (template_key, lang) do update
set body = excluded.body;
