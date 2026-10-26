-- Funções de progresso (Task 2): register_session e update_progress
-- Ambas SECURITY INVOKER: o RLS do chamador vale.

-- ============ update_progress ============
create or replace function public.update_progress(p_book_id uuid, p_page int, p_status text default null)
returns public.books
language plpgsql
security invoker
as $$
declare
  b public.books;
  new_status text;
  today date := current_date;
begin
  select * into b from public.books where id = p_book_id and user_id = auth.uid();
  if not found then
    raise exception using errcode = 'P0001', message = 'book_not_found';
  end if;

  if p_page < 0 then
    raise exception using errcode = 'P0001', message = 'page_negative';
  end if;
  if b.total_pages is not null and p_page > b.total_pages then
    raise exception using errcode = 'P0001', message = 'page_exceeds_total';
  end if;
  if p_status is not null and p_status not in ('Quero ler', 'Lendo', 'Pausado', 'Concluído', 'Abandonado') then
    raise exception using errcode = 'P0001', message = 'invalid_status';
  end if;

  -- nextStatus (espelha backend/src/utils/progress.ts)
  if p_status is not null then
    new_status := p_status;
  elsif b.total_pages is not null and p_page >= b.total_pages then
    new_status := 'Concluído';
  elsif b.status is null or b.status in ('Quero ler', 'Pausado') then
    new_status := 'Lendo';
  else
    new_status := b.status;
  end if;

  update public.books set
    current_page = p_page,
    status = new_status,
    started_at = case
      when started_at is null and new_status in ('Lendo', 'Concluído') then today
      else started_at end,
    finished_at = case
      when new_status = 'Concluído' and finished_at is null then today
      else finished_at end
  where id = p_book_id and user_id = auth.uid()
  returning * into b;

  return b;
end;
$$;

-- ============ register_session ============
create or replace function public.register_session(
  p_book_id uuid,
  p_title text,
  p_date date,
  p_start_page int default null,
  p_end_page int default null,
  p_duration_min numeric default null,
  p_spotify_url text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  b public.books;
  s public.reading_sessions;
  new_page int;
  new_status text;
  session_date date := coalesce(p_date, current_date);
  computed_pages int;
begin
  if p_title is null or char_length(p_title) < 1 then
    raise exception using errcode = 'P0001', message = 'title_required';
  end if;

  select * into b from public.books where id = p_book_id and user_id = auth.uid();
  if not found then
    raise exception using errcode = 'P0001', message = 'book_not_found';
  end if;

  -- Validações de borda (Review Focus 5)
  if p_start_page is not null and p_end_page is not null and p_end_page <= p_start_page then
    raise exception using errcode = 'P0001', message = 'end_page_must_exceed_start_page';
  end if;
  if p_end_page is not null and b.total_pages is not null and p_end_page > b.total_pages then
    raise exception using errcode = 'P0001', message = 'end_page_exceeds_total';
  end if;
  if p_start_page is not null and p_start_page < 0 then
    raise exception using errcode = 'P0001', message = 'page_negative';
  end if;
  if p_end_page is not null and p_end_page < 0 then
    raise exception using errcode = 'P0001', message = 'page_negative';
  end if;

  if p_start_page is not null and p_end_page is not null then
    computed_pages := p_end_page - p_start_page;
  else
    computed_pages := null;
  end if;

  -- A página atual só avança
  if p_end_page is not null then
    new_page := greatest(coalesce(b.current_page, 0), p_end_page);
  else
    new_page := coalesce(b.current_page, 0);
  end if;

  -- nextStatus com a página resultante
  if b.total_pages is not null and p_end_page is not null and new_page >= b.total_pages then
    new_status := 'Concluído';
  elsif b.status is null or b.status in ('Quero ler', 'Pausado') then
    -- Só muda para Lendo se a sessão tem efeito (tem end_page) ou o livro já estava em progresso?
    -- Espelha applyProgress: registrar sessão sempre move Quero ler/Pausado → Lendo.
    new_status := 'Lendo';
  else
    new_status := b.status;
  end if;

  insert into public.reading_sessions
    (user_id, book_id, title, date, start_page, end_page, pages_read, duration_min, spotify_url, notes)
  values
    (auth.uid(), p_book_id, p_title, session_date, p_start_page, p_end_page, computed_pages, p_duration_min, p_spotify_url, p_notes)
  returning * into s;

  update public.books set
    current_page = new_page,
    status = new_status,
    started_at = case
      when started_at is null and new_status in ('Lendo', 'Concluído') then session_date
      else started_at end,
    finished_at = case
      when new_status = 'Concluído' and finished_at is null then session_date
      else finished_at end
  where id = p_book_id and user_id = auth.uid()
  returning * into b;

  return jsonb_build_object(
    'session', to_jsonb(s),
    'book', to_jsonb(b)
  );
end;
$$;
