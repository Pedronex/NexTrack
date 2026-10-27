-- NexTrack multiusuário — esquema base (Task 1)
-- Tabelas: profiles, books, reading_sessions, spotify_connections, spotify_oauth_states

-- Necessário para gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============ profiles ============
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  yearly_goal int not null default 24 check (yearly_goal >= 1),
  show_mini_player boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ books ============
create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) >= 1),
  author text,
  status text check (status in ('Quero ler', 'Lendo', 'Pausado', 'Concluído', 'Abandonado')),
  format text check (format in ('Físico', 'Digital', 'E-Book', 'Audiobook')),
  current_page int not null default 0 check (current_page >= 0),
  total_pages int check (total_pages >= 1),
  started_at date,
  finished_at date,
  rating numeric check (rating >= 0 and rating <= 5),
  isbn text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (total_pages is null or current_page <= total_pages),
  check (finished_at is null or started_at is null or finished_at >= started_at)
);

-- ============ reading_sessions ============
create table public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  book_id uuid,
  title text not null check (char_length(title) >= 1),
  date date not null,
  start_page int check (start_page >= 0),
  end_page int check (end_page >= 0),
  pages_read int check (pages_read >= 0),
  duration_min numeric check (duration_min >= 0),
  spotify_url text,
  notes text,
  created_at timestamptz not null default now(),
  constraint reading_sessions_book_fk
    foreign key (book_id, user_id) references public.books (id, user_id) on delete cascade
);

-- ============ spotify_connections (só Worker, sem políticas) ============
create table public.spotify_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token_enc text not null,
  refresh_token_enc text not null,
  expires_at timestamptz not null,
  scope text,
  spotify_user_id text,
  spotify_name text,
  product text,
  status text not null default 'connected' check (status in ('connected', 'expired')),
  connected_at timestamptz not null default now()
);

-- ============ spotify_oauth_states (só Worker, sem políticas) ============
create table public.spotify_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  code_verifier text not null,
  created_at timestamptz not null default now()
);

-- ============ índices ============
create index books_user_status_idx on public.books (user_id, status);
create index sessions_user_date_idx on public.reading_sessions (user_id, date desc);
create index sessions_book_idx on public.reading_sessions (book_id);

-- ============ updated_at ============
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger books_set_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

-- ============ trigger de perfil ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text := coalesce(
    nullif(meta ->> 'display_name', ''),
    nullif(meta ->> 'name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), '')
  );
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, name)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.spotify_connections enable row level security;
alter table public.spotify_oauth_states enable row level security;

-- profiles/books/sessions: dono vê e altera só as próprias linhas
create policy "owner_all" on public.profiles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "owner_all" on public.books
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "owner_all" on public.reading_sessions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- spotify_connections e spotify_oauth_states: RLS ligado SEM política
-- (negado a anon e authenticated; só service_role via Worker).
