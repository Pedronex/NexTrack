-- Hardening pós-advisors (Tasks 1-2):
-- 1. search_path fixo nas funções (lint function_search_path_mutable).
-- 2. handle_new_user não executável via REST (só o trigger a usa).

-- search_path fixo (comportamento idêntico: referências já qualificadas)
alter function public.set_updated_at() set search_path = public;
alter function public.update_progress(uuid, int, text) set search_path = public;
alter function public.register_session(uuid, text, date, int, int, numeric, text, text) set search_path = public;

-- O trigger dispara com direitos do definidor; chamadas REST diretas são negadas.
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;
