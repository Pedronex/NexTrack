-- Testes de register_session / update_progress (Task 2), com rollback.
begin;

do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  book_id uuid;
  book_no_total uuid;
  res jsonb;
  b public.books;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  values
    (user_a, 'pa@example.com', 'x', now(), now(), now()),
    (user_b, 'pb@example.com', 'x', now(), now(), now());

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);

  insert into public.books (title, status, total_pages, current_page)
  values ('Livro 656', 'Quero ler', 656, 0) returning id into book_id;
  insert into public.books (title, status)
  values ('Sem total', 'Quero ler') returning id into book_no_total;

  -- (a) sessão 0→100: Lendo, current_page=100, started_at=p_date
  select public.register_session(book_id, 'S1', '2026-01-05'::date, 0, 100, null, null, null) into res;
  if (res->'book'->>'status') <> 'Lendo' then raise exception 'a_status %', res->'book'->>'status'; end if;
  if (res->'book'->>'current_page') <> '100' then raise exception 'a_page'; end if;
  if (res->'book'->>'started_at') <> '2026-01-05' then raise exception 'a_started'; end if;
  if (res->'session'->>'pages_read') <> '100' then raise exception 'g_pages_read'; end if;

  -- (b) sessão 100→656: Concluído, finished_at=p_date, current_page=656
  select public.register_session(book_id, 'S2', '2026-02-01'::date, 100, 656, 30, null, null) into res;
  if (res->'book'->>'status') <> 'Concluído' then raise exception 'b_status'; end if;
  if (res->'book'->>'finished_at') <> '2026-02-01' then raise exception 'b_finished'; end if;
  if (res->'book'->>'current_page') <> '656' then raise exception 'b_page'; end if;

  -- (c) end menor que a página atual não reduz current_page
  select public.register_session(book_id, 'S3', '2026-02-02'::date, 0, 50, null, null, null) into res;
  if (res->'book'->>'current_page') <> '656' then raise exception 'c_receded'; end if;

  -- (d) end <= start levanta erro
  begin
    perform public.register_session(book_id, 'Sx', current_date, 50, 50, null, null, null);
    raise exception 'd_should_fail';
  exception when raise_exception then
    if sqlerrm <> 'end_page_must_exceed_start_page' then raise; end if;
  end;

  -- (e) end maior que total levanta erro
  begin
    perform public.register_session(book_id, 'Sy', current_date, 0, 700, null, null, null);
    raise exception 'e_should_fail';
  exception when raise_exception then
    if sqlerrm <> 'end_page_exceeds_total' then raise; end if;
  end;

  -- (f) livro sem total aceita sessão e nunca conclui sozinho
  select public.register_session(book_no_total, 'Sn', current_date, 0, 5000, null, null, null) into res;
  if (res->'book'->>'status') <> 'Lendo' then raise exception 'f_status'; end if;
  if (res->'book'->>'current_page') <> '5000' then raise exception 'f_page'; end if;

  -- (g) duration nulo aceito (já coberto acima: duration null em S1)

  -- (h) usuário B com book_id de A levanta book_not_found
  perform set_config('request.jwt.claims', json_build_object('sub', user_b::text, 'role', 'authenticated')::text, true);
  begin
    perform public.register_session(book_id, 'Hack', current_date, 0, 10, null, null, null);
    raise exception 'h_should_fail';
  exception when raise_exception then
    if sqlerrm <> 'book_not_found' then raise; end if;
  end;

  -- (i) update_progress: status explícito Pausado mantém página e muda status
  perform set_config('request.jwt.claims', json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
  select * into b from public.update_progress(book_no_total, 5000, 'Pausado');
  if b.status <> 'Pausado' or b.current_page <> 5000 then raise exception 'i_paused'; end if;
  -- sem status: Quero ler → Lendo (usa livro novo para isolar)
  insert into public.books (title, status, total_pages, current_page)
  values ('Prog', 'Quero ler', 200, 0) returning id into book_id;
  select * into b from public.update_progress(book_id, 50);
  if b.status <> 'Lendo' or b.current_page <> 50 then raise exception 'i_auto'; end if;
  -- página acima do total levanta page_exceeds_total
  begin
    perform public.update_progress(book_id, 500);
    raise exception 'i_should_fail';
  exception when raise_exception then
    if sqlerrm <> 'page_exceeds_total' then raise; end if;
  end;

  reset role;
  delete from auth.users where id in (user_a, user_b);
end;
$$;

rollback;
select 'OK';
