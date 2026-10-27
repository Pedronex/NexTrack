-- Endurecimento: privilégios mínimos e search_path vazio.

-- 1. Tabelas do Spotify: só o service_role (Worker) acessa.
revoke all on table public.spotify_connections, public.spotify_oauth_states from anon, authenticated;

-- 2. anon nunca acessa dados; authenticated perde privilégios que o RLS não cobre (TRUNCATE etc.).
revoke all on table public.profiles, public.books, public.reading_sessions from anon;
revoke truncate, references, trigger on table public.profiles, public.books, public.reading_sessions from authenticated;

-- 3. RPCs só para usuários autenticados (e service_role).
revoke execute on function public.register_session(uuid, text, date, int, int, numeric, text, text) from public, anon;
revoke execute on function public.update_progress(uuid, int, text) from public, anon;
grant execute on function public.register_session(uuid, text, date, int, int, numeric, text, text) to authenticated, service_role;
grant execute on function public.update_progress(uuid, int, text) to authenticated, service_role;

-- 4. search_path vazio (todas as referências nas funções já são qualificadas).
alter function public.set_updated_at() set search_path = '';
alter function public.handle_new_user() set search_path = '';
alter function public.update_progress(uuid, int, text) set search_path = '';
alter function public.register_session(uuid, text, date, int, int, numeric, text, text) set search_path = '';
