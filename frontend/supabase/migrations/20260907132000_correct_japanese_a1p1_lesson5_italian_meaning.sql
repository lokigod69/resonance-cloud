-- Converge the already-published Japanese A1 P1 lesson 5 Italian meaning.
-- Fresh replays of 131000 already contain the corrected value, making this a no-op.
begin;

do $$
declare
  v_path constant text := 'japanese-a1-practical-1';
  v_lesson constant text := 'japanese-a1-practical-1-lesson-5-korewa-nan-desuka';
  v_vibe constant text := 'bright';
  v_hash constant text := 'c1ed5405f8d17689d82cad41a27b36daed4923df00e30f6e3bd854afcdac977b';
  v_old constant text := E'Cos''è questo? \nQuesto è un oggetto che non conosco. Cos''è?';
  v_new constant text := 'Cos''è questo?';
  v_current text;
begin
  select c.translations ->> 'Italian'
    into v_current
    from public.guided_phrase_catalog c
   where c.path_id = v_path and c.lesson_id = v_lesson and c.vibe = v_vibe
     and c.content_hash = v_hash
   for update;

  if not found then
    raise exception 'Corrected Guided catalog coordinate or content hash is missing'
      using errcode = '22023';
  end if;

  if v_current = v_old then
    update public.guided_phrase_catalog
       set translations = jsonb_set(translations, '{Italian}', to_jsonb(v_new), false),
           updated_at = now()
     where path_id = v_path and lesson_id = v_lesson and vibe = v_vibe
       and content_hash = v_hash
       and translations ->> 'Italian' = v_old;
    if not found then
      raise exception 'Corrected Guided catalog value changed concurrently'
        using errcode = '40001';
    end if;
  elsif v_current is distinct from v_new then
    raise exception 'Unexpected existing Italian meaning for corrected Guided coordinate'
      using errcode = '22023';
  end if;

  if (select c.translations ->> 'Italian'
        from public.guided_phrase_catalog c
       where c.path_id = v_path and c.lesson_id = v_lesson and c.vibe = v_vibe)
       is distinct from v_new
  then
    raise exception 'Corrected Guided Italian meaning did not converge';
  end if;
end
$$;

commit;
