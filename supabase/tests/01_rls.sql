-- Teste RLS multiusuário (Task 1) — roda em transação com rollback.
-- Uso: psql / execute_sql com o conteúdo. Termina com select 'OK'.
begin;

do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  book_a uuid;
  cnt int;
begin
  -- Cria dois usuários (dispara handle_new_user → profiles)
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  values
    (user_a, 'a@example.com', 'x', now(), '{"display_name":"Alice"}', now(), now()),
    (user_b, 'b@example.com', 'x', now(), '{"name":"Beto"}', now(), now());

  -- (h) trigger de perfil criou linhas com o nome esperado
  perform 1 from public.profiles where user_id = user_a and display_name = 'Alice';
  if not found then raise exception 'profile_a_missing'; end if;
  perform 1 from public.profiles where user_id = user_b and display_name = 'Beto';
  if not found then raise exception 'profile_b_missing'; end if;

  -- A insere um livro como authenticated/A
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
  insert into public.books (title, total_pages) values ('Livro de A', 100) returning id into book_a;

  -- (a) B faz select e vê 0 linhas do livro de A
  perform set_config('request.jwt.claims', json_build_object('sub', user_b::text, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.books where id = book_a;
  if cnt <> 0 then raise exception 'rls_read_leak'; end if;

  -- (b) B não consegue update nem delete no livro de A
  update public.books set title = 'hack' where id = book_a;
  get diagnostics cnt = row_count;
  if cnt <> 0 then raise exception 'rls_update_leak'; end if;
  delete from public.books where id = book_a;
  get diagnostics cnt = row_count;
  if cnt <> 0 then raise exception 'rls_delete_leak'; end if;

  -- (c) B não consegue inserir sessão apontando para o livro de A (chave composta)
  begin
    insert into public.reading_sessions (title, date, book_id) values ('Sessão B', current_date, book_a);
    raise exception 'fk_should_fail';
  exception when foreign_key_violation then
    -- esperado
  end;

  -- (d) current_page > total_pages rejeitado
  perform set_config('request.jwt.claims', json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
  begin
    insert into public.books (title, current_page, total_pages) values ('Inválido', 200, 100);
    raise exception 'check_should_fail_pages';
  exception when check_violation then
  end;

  -- (e) rating = 6 rejeitado
  begin
    insert into public.books (title, rating) values ('Nota alta', 6);
    raise exception 'check_should_fail_rating';
  exception when check_violation then
  end;

  -- (f) authenticated não lê tabelas do Spotify (RLS sem política)
  begin
    perform 1 from public.spotify_connections limit 1;
    -- Se chegou aqui sem erro, precisa ter 0 linhas visíveis; como não há política, select deve falhar.
    -- Algumas configs retornam 0 linhas em vez de erro: aceita 0 linhas, rejeita >0.
    select count(*) into cnt from public.spotify_connections;
    if cnt <> 0 then raise exception 'spotify_conn_visible'; end if;
  exception when insufficient_privilege then
    -- esperado em setups estritos
  end;
  begin
    select count(*) into cnt from public.spotify_oauth_states;
    if cnt <> 0 then raise exception 'spotify_state_visible'; end if;
  exception when insufficient_privilege then
  end;

  -- (g) excluir o usuário apaga livros e sessões (cascata)
  insert into public.reading_sessions (title, date, book_id) values ('S1', current_date, book_a);
  reset role;
  delete from auth.users where id = user_a;
  perform 1 from public.books where id = book_a;
  if found then raise exception 'cascade_books_failed'; end if;
  perform 1 from public.reading_sessions where book_id = book_a;
  if found then raise exception 'cascade_sessions_failed'; end if;

  -- limpa B
  delete from auth.users where id = user_b;
end;
$$;

rollback;
select 'OK';
