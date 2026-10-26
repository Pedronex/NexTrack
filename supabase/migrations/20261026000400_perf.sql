-- Performance pós-advisors:
-- 1. auth_rls_initplan: (select auth.uid()) nas políticas (avaliado uma vez).
-- 2. unindexed_foreign_keys: cobertura das FKs compostas/de usuário.

drop policy if exists "owner_all" on public.profiles;
create policy "owner_all" on public.profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "owner_all" on public.books;
create policy "owner_all" on public.books
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "owner_all" on public.reading_sessions;
create policy "owner_all" on public.reading_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index if not exists sessions_book_user_idx
  on public.reading_sessions (book_id, user_id);
create index if not exists spotify_states_user_idx
  on public.spotify_oauth_states (user_id);
