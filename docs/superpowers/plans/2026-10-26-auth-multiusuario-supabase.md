# Autenticação e multiusuário — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar o NexTrack para qualquer pessoa, com cadastro livre (Google, Spotify, e-mail e senha) e dados isolados por usuário, trocando o Notion por Supabase e o backend Bun por um Cloudflare Worker.

**Architecture:** O Next (Vercel) guarda a sessão do Supabase em cookie e chama o Worker com `Authorization: Bearer <JWT do usuário>`. O Worker valida o JWT e consulta o Postgres com o token do próprio usuário, então o RLS isola os dados. Os tokens do Spotify ficam cifrados em tabelas só acessíveis ao Worker (chave de serviço).

**Tech Stack:** Supabase (Postgres, Auth, RLS), Cloudflare Workers, Elysia, `jose`, `@supabase/supabase-js`, `@supabase/ssr`, Next 16 (`cacheComponents`), Tailwind 4, Bun, Vitest (frontend), `bun test` (Worker).

**Spec:** `docs/superpowers/specs/2026-10-26-auth-multiusuario-supabase-design.md`

## Global Constraints

- Frontend: Next 16 com `cacheComponents` mantido; convenção `proxy.ts` do Next 16 (confirmar em `frontend/node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` antes de escrever).
- Worker: Elysia com adaptador do Cloudflare e `compatibility_flags = ["nodejs_compat"]`; nenhum uso de API exclusiva do Bun em `backend/src/` (só Web APIs e Node compat).
- JWT: validar assinatura por JWKS, `iss`, `aud = authenticated` e `exp`; sem token válido, 401.
- Erros da API em formato único `{ error, code }`; nenhum token ou segredo em logs.
- IDs UUID; mesmos endpoints e mesmo JSON camelCase de hoje (`Book`, `ReadingSession` em `backend/src/types/index.d.ts`).
- Todas as tabelas de dados com `user_id uuid not null default auth.uid() references auth.users on delete cascade` e RLS ligado; `spotify_connections` e `spotify_oauth_states` com RLS ligado **sem política** (negado a `anon` e `authenticated`).
- Tokens do Spotify cifrados com AES-GCM; `state` do OAuth vale 10 minutos.
- Escopos do Spotify: `user-read-playback-state`, `user-modify-playback-state`, `user-read-currently-playing`, `user-read-private`.
- Senha com mínimo de 8 caracteres; confirmação de e-mail obrigatória no cadastro.
- Excluir conta exige login nos últimos 15 minutos e a palavra `EXCLUIR` na interface.
- Mini player consulta a cada 5 s e pausa com a aba oculta.
- `SUPABASE_SERVICE_ROLE_KEY` só em segredos do Worker; nunca em bundle do frontend.
- Todos os textos da interface em português do Brasil, iguais aos frames do `NexTrack.pen`.
- O código do Notion só é removido depois de a importação ser validada.

## Review Focus

1. **Acesso entre usuários por UUID:** usuário B faz `GET/PATCH/DELETE /books/:id` e `/sessions/:id` com ID do usuário A e recebe 404, sem vazar existência (testes nas tarefas 1, 6 e 7).
2. **Open redirect no callback:** `/auth/callback?next=https://evil.com` ou `//evil.com` deve cair em `/`, só aceitando caminhos relativos (tarefa 12).
3. **Cache vazando entre contas:** depois de A gravar, B não vê nada de A e A vê a gravação imediatamente (tarefa 11).
4. **Spotify revogado ou em corrida:** `invalid_grant` marca a conexão como expirada sem martelar o Spotify a cada 5 s, e duas renovações simultâneas não se sobrescrevem (tarefa 9).
5. **Bordas de progresso:** sessão com `endPage` menor ou igual à inicial, maior que o total, livro sem total de páginas e duração nula; a página atual nunca recua (tarefa 2).

---

### Task 1: Esquema, RLS e trigger de perfil

**Files:**
- Create: `supabase/migrations/20261026000100_schema.sql`
- Create: `supabase/tests/01_rls.sql`

**Interfaces:**
- Produces: tabelas `profiles`, `books`, `reading_sessions`, `spotify_connections`, `spotify_oauth_states` (colunas e restrições da spec, seção 5); trigger `on auth.users insert → public.handle_new_user()` que cria a linha de `profiles` (`display_name` vem de `raw_user_meta_data->>'display_name'`, senão de `raw_user_meta_data->>'name'`, senão da parte local do e-mail).

- [ ] **Step 1: Escrever `supabase/tests/01_rls.sql` (falha, pois as tabelas não existem).** Um bloco `do $$ … $$` dentro de transação com `rollback` no fim, que cria dois usuários em `auth.users` e, com `set local role authenticated` + `set local request.jwt.claims`, afirma: (a) A insere livro e B faz `select` retornando 0 linhas; (b) B não consegue `update` nem `delete` no livro de A (0 linhas afetadas); (c) B não consegue inserir sessão apontando para o livro de A (erro de chave composta); (d) `current_page > total_pages` é rejeitado; (e) `rating = 6` é rejeitado; (f) `authenticated` não consegue `select` em `spotify_connections` e `spotify_oauth_states` (erro de permissão ou 0 linhas com RLS sem política); (g) excluir o usuário apaga seus livros e sessões; (h) o cadastro cria `profiles` com o nome esperado. O arquivo termina com `select 'OK'`.
- [ ] **Step 2: Rodar e confirmar a falha.** Executar o conteúdo com `mcp__supabase__execute_sql`. Esperado: erro `relation "public.books" does not exist`.
- [ ] **Step 3: Escrever a migração `20261026000100_schema.sql`** com tabelas, restrições, índices (`books (user_id, status)`, `reading_sessions (user_id, date desc)`, `reading_sessions (book_id)`), `unique (id, user_id)` em `books`, FK composta `(book_id, user_id)` em `reading_sessions`, políticas `for all to authenticated using/with check (user_id = auth.uid())` em `profiles` (chave `user_id`), `books` e `reading_sessions`, `updated_at` mantido por trigger, e o trigger de perfil. Aplicar com `mcp__supabase__apply_migration` (mesmo conteúdo do arquivo).
- [ ] **Step 4: Rodar `01_rls.sql` de novo.** Esperado: `OK`. Rodar `mcp__supabase__get_advisors` (tipo `security`); esperado: nenhum alerta de tabela sem RLS.
- [ ] **Step 5: Commit** — `git add supabase && git commit -m "feat(db): esquema multiusuário com RLS"`.

### Task 2: Funções `register_session` e `update_progress`

**Files:**
- Create: `supabase/migrations/20261026000200_progress_functions.sql`
- Create: `supabase/tests/02_progress.sql`

**Interfaces:**
- Consumes: tabelas da Tarefa 1.
- Produces (ambas `security invoker`, transação única):
  - `public.register_session(p_book_id uuid, p_title text, p_date date, p_start_page int, p_end_page int, p_duration_min numeric, p_spotify_url text, p_notes text) returns jsonb` → `{ "session": <linha de reading_sessions>, "book": <linha de books> }`
  - `public.update_progress(p_book_id uuid, p_page int, p_status text default null) returns public.books`

- [ ] **Step 1: Escrever `02_progress.sql`** (mesmo padrão de dois usuários e `rollback`) com estas afirmações: (a) livro `Quero ler`, 656 páginas, sessão 0→100 ⇒ livro `Lendo`, `current_page = 100`, `started_at = p_date`; (b) sessão 100→656 ⇒ `Concluído`, `finished_at = p_date`, `current_page = 656`; (c) sessão com `p_end_page` menor que a página atual **não** reduz `current_page` (só avança); (d) `p_end_page <= p_start_page` levanta erro `end_page_must_exceed_start_page`; (e) `p_end_page` maior que `total_pages` levanta `end_page_exceeds_total`; (f) livro sem `total_pages` aceita sessão e nunca conclui sozinho; (g) `pages_read = end - start`; `duration_min` nulo é aceito; (h) usuário B chamando com o `book_id` de A levanta `book_not_found`; (i) `update_progress` com status explícito `Pausado` mantém a página e muda o status; sem status, aplica as mesmas regras de (a)/(b); página acima do total levanta `page_exceeds_total`. Termina com `select 'OK'`.
- [ ] **Step 2: Rodar e confirmar a falha** (`function register_session… does not exist`).
- [ ] **Step 3: Implementar as duas funções** reproduzindo `nextStatus`/`applyProgress` de `backend/src/utils/progress.ts` (status `Lendo` quando era `Quero ler`, `Pausado` ou nulo; `Concluído` ao atingir `total_pages`; `started_at` e `finished_at` só se vazios). Erros com `raise exception using errcode = 'P0001', message = '<código acima>'`. Aplicar com `apply_migration`.
- [ ] **Step 4: Rodar `02_progress.sql` e `01_rls.sql`.** Esperado: `OK` nos dois.
- [ ] **Step 5: Commit** — `git commit -m "feat(db): funções de progresso e sessão"`.

### Task 3: Scaffold do Worker (spike do adaptador)

**Files:**
- Create: `backend/wrangler.jsonc`, `backend/src/worker.ts`, `backend/src/config/worker-env.ts`, `backend/src/lib/errors.ts`
- Modify: `backend/package.json` (scripts `worker:dev`, `worker:deploy`, `test`; dependências `@elysiajs/cloudflare`, `@supabase/supabase-js`, `jose`; dev `wrangler`)
- Test: `backend/src/lib/errors.test.ts`

**Interfaces:**
- Produces:
  - `class ApiError extends Error { constructor(public status: number, public code: string, message: string) }`
  - `toErrorResponse(error: unknown): { status: number; body: { error: string; code: string } }` (erro desconhecido ⇒ 500 `internal_error`, mensagem genérica, sem detalhes)
  - `type Env = { SUPABASE_URL: string; SUPABASE_PUBLISHABLE_KEY: string; SUPABASE_SERVICE_ROLE_KEY: string; SPOTIFY_CLIENT_ID: string; SPOTIFY_CLIENT_SECRET: string; SPOTIFY_REDIRECT_URI: string; TOKEN_ENCRYPTION_KEY: string }` e `parseEnv(raw: unknown): Env` (zod, lança listando as variáveis ausentes sem imprimir valores) em `config/worker-env.ts`
  - `src/worker.ts` exporta `default` com `fetch(request, env, ctx)`; rota `GET /health` → `{ ok: true }`

- [ ] **Step 1: Escrever `errors.test.ts`:** `toErrorResponse(new ApiError(404,"not_found","Livro não encontrado"))` ⇒ `{status:404, body:{error:"Livro não encontrado", code:"not_found"}}`; `toErrorResponse(new Error("senha=abc"))` ⇒ status 500, `code:"internal_error"` e `body.error` sem a palavra `senha`. Teste de `parseEnv({})` lançando erro cuja mensagem contém `SUPABASE_URL` e não contém valores.
- [ ] **Step 2: Rodar** `cd backend && bun test` ⇒ FAIL (módulos inexistentes).
- [ ] **Step 3: Implementar** `errors.ts` e `worker-env.ts`; criar `wrangler.jsonc` (`main: src/worker.ts`, `compatibility_date` atual, `nodejs_compat`); criar `worker.ts` com Elysia + `CloudflareAdapter` e `onError` usando `toErrorResponse`. Seguir a doc oficial do `@elysiajs/cloudflare` para o formato do `export default`.
- [ ] **Step 4: Verificar.** `bun test` ⇒ PASS. `cd backend && bunx wrangler dev --local` e `curl localhost:8787/health` ⇒ `{"ok":true}`. Se o adaptador não rodar com as dependências, **parar e reportar** antes de seguir (risco da spec, seção 13).
- [ ] **Step 5: Commit** — `git commit -m "feat(worker): scaffold do Worker com erros e env"`.

### Task 4: Validação de JWT e plugin de autenticação

**Files:**
- Create: `backend/src/auth/jwt.ts`, `backend/src/auth/plugin.ts`
- Test: `backend/src/auth/jwt.test.ts`

**Interfaces:**
- Consumes: `ApiError`, `Env`.
- Produces:
  - `type AuthUser = { id: string; email: string | null; token: string }`
  - `verifyAccessToken(token: string, opts: { getKey: JWTVerifyGetKey; issuer: string }): Promise<AuthUser>` (lança `ApiError(401,"unauthorized","Sessão inválida")`)
  - `createJwksGetter(env: Env): JWTVerifyGetKey` (`createRemoteJWKSet` em `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
  - `authPlugin(env: Env, getKey = createJwksGetter(env))` → plugin Elysia com `.derive` que lê `Authorization: Bearer` e entrega `{ user: AuthUser }`; rotas que o usam respondem 401 sem token.

- [ ] **Step 1: Escrever `jwt.test.ts`** gerando um par de chaves com `jose` (`generateKeyPair`, `createLocalJWKSet`) e assinando tokens: aceita token válido (`sub`, `aud:"authenticated"`, `iss`, `exp` futuro) e devolve `id = sub`; rejeita (401) token expirado, `aud` diferente, `iss` diferente, assinatura de outra chave, `role:"anon"` com `aud` errado, header ausente e `Bearer` vazio.
- [ ] **Step 2: Rodar** `bun test src/auth` ⇒ FAIL.
- [ ] **Step 3: Implementar** com `jwtVerify(token, getKey, { issuer, audience: "authenticated" })`; `issuer = ${SUPABASE_URL}/auth/v1`.
- [ ] **Step 4: Rodar** ⇒ PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(worker): validação de JWT do Supabase"`.

### Task 5: Clientes de banco e mapeadores

**Files:**
- Create: `backend/src/db/clients.ts`, `backend/src/db/mappers.ts`, `backend/src/db/rows.ts`
- Test: `backend/src/db/mappers.test.ts`

**Interfaces:**
- Consumes: `Env`, tipos `Book`, `ReadingSession`.
- Produces:
  - `userDb(env: Env, token: string): SupabaseClient` (chave publicável + `global.headers.Authorization = Bearer token`, `auth.persistSession = false`); `serviceDb(env: Env): SupabaseClient` (chave de serviço)
  - `type BookRow`, `type SessionRow` (colunas snake_case da Tarefa 1) em `rows.ts`
  - `toBook(row: BookRow): Book`, `toSession(row: SessionRow): ReadingSession`, `toBookRow(input: Partial<Omit<Book,"id">>): Partial<BookRow>`, `toSessionRow(input: Partial<Omit<ReadingSession,"id">>): Partial<SessionRow>`

- [ ] **Step 1: Escrever `mappers.test.ts`:** `toBook` converte `current_page → currentPage`, `total_pages → totalPages`, `started_at → startedAt` (string `YYYY-MM-DD`); `toBookRow` só inclui chaves presentes na entrada e preserva `null` (limpar campo); `toSession` mapeia `book_id → bookId`, `duration_min → durationMin`, `spotify_url → spotifyUrl`.
- [ ] **Step 2: Rodar** ⇒ FAIL. **Step 3: Implementar.** **Step 4: Rodar** ⇒ PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(worker): clientes Supabase e mapeadores"`.

### Task 6: Rotas de livros

**Files:**
- Create: `backend/src/routes/books.ts`
- Test: `backend/src/routes/books.test.ts`
- Modify: `backend/src/worker.ts` (registrar rota)

**Interfaces:**
- Consumes: `authPlugin`, `userDb`, mapeadores, `ApiError`.
- Produces: `booksRoutes(deps: RouteDeps)` com `type RouteDeps = { env: Env; db: (token: string) => SupabaseClient }`. Endpoints (mesmos corpos de validação zod de `backend/src/functions/books.ts`): `GET /books?status&cursor&limit` → `{ data, nextCursor, hasMore }` (cursor por offset opaco, `limit` máx. 100); `GET /books/:id`; `POST /books`; `PATCH /books/:id`; `PATCH /books/:id/progress` (chama `update_progress`); `DELETE /books/:id` → `{ ok: true }`.

- [ ] **Step 1: Escrever `books.test.ts`** com um banco falso injetado (`deps.db`) e `getKey` local: sem token ⇒ 401; `GET /books/:id` inexistente ou de outro usuário (a consulta devolve vazio) ⇒ 404 `{code:"not_found"}`; `POST /books` sem título ⇒ 400 com `code:"validation_error"`; `PATCH` com `currentPage` maior que `totalPages` ⇒ 400 (erro `P0001` ou violação de check mapeada); `DELETE` de livro alheio ⇒ 404 (0 linhas afetadas); `limit=500` ⇒ 400.
- [ ] **Step 2: Rodar** ⇒ FAIL. **Step 3: Implementar**; erros do Postgres: `PGRST116`/0 linhas ⇒ 404, `23503`/`23514`/`P0001` ⇒ 400 com o `code` da função SQL. **Step 4: Rodar** ⇒ PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(worker): rotas de livros"`.

### Task 7: Rotas de sessões

**Files:**
- Create: `backend/src/routes/sessions.ts`
- Test: `backend/src/routes/sessions.test.ts`
- Modify: `backend/src/worker.ts`

**Interfaces:**
- Consumes: `RouteDeps`, `toSession`, `toBook`.
- Produces: `sessionsRoutes(deps: RouteDeps)`: `GET /sessions?bookId&cursor&limit` (ordem `date desc`); `GET /sessions/:id`; `POST /sessions` (corpo de `sessions.ts` atual; chama `register_session`; resposta `201 { ...session, book }`; título vazio ⇒ 400); `PATCH /sessions/:id`; `DELETE /sessions/:id` (não recua o livro, como hoje).

- [ ] **Step 1: Escrever `sessions.test.ts`:** sem token ⇒ 401; `POST` com `bookId` de outro usuário ⇒ 404 (`book_not_found` da função); `endPage <= startPage` ⇒ 400 `end_page_must_exceed_start_page`; resposta de sucesso contém `book.currentPage` e `book.status` devolvidos pela função; `GET /sessions/:id` alheio ⇒ 404.
- [ ] **Step 2–4:** rodar FAIL, implementar, rodar PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(worker): rotas de sessões"`.

### Task 8: Perfil e conta (`/me`)

**Files:**
- Create: `backend/src/routes/me.ts`
- Test: `backend/src/routes/me.test.ts`
- Modify: `backend/src/worker.ts`

**Interfaces:**
- Consumes: `RouteDeps` + `serviceDb`.
- Produces: `meRoutes(deps: RouteDeps & { service: () => SupabaseClient; now: () => number })`: `GET /me` → `{ id, email, displayName, yearlyGoal, showMiniPlayer, providers: string[] }` (`providers` vem de `identities` do usuário no Auth); `PATCH /me` com `{ displayName?, yearlyGoal?, showMiniPlayer? }` (`yearlyGoal` inteiro ≥ 1); `DELETE /me` → 204.

- [ ] **Step 1: Escrever `me.test.ts`:** `PATCH` com `yearlyGoal: 0` ⇒ 400; `DELETE /me` com `last_sign_in_at` há 20 minutos ⇒ 403 `code:"recent_login_required"` e **nenhuma** exclusão chamada; com 5 minutos ⇒ 204 e `auth.admin.deleteUser(userId)` chamado uma vez (o `last_sign_in_at` vem de `auth.admin.getUserById`).
- [ ] **Step 2–4:** FAIL, implementar, PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(worker): perfil e exclusão de conta"`.

### Task 9: Cifra e serviço de tokens do Spotify

**Files:**
- Create: `backend/src/lib/crypto.ts`, `backend/src/spotify/tokens.ts`
- Test: `backend/src/lib/crypto.test.ts`, `backend/src/spotify/tokens.test.ts`

**Interfaces:**
- Produces:
  - `encrypt(plain: string, keyB64: string): Promise<string>` (AES-GCM, IV aleatório de 12 bytes prefixado, base64) e `decrypt(cipher: string, keyB64: string): Promise<string>`
  - `type SpotifyStore = { get(userId: string): Promise<StoredConnection | null>; save(userId: string, c: StoredConnection): Promise<void>; saveIfRefreshTokenIs(userId: string, expectedRefreshEnc: string, c: StoredConnection): Promise<boolean>; markExpired(userId: string): Promise<void> }`
  - `getValidAccessToken(deps: { store: SpotifyStore; refresh: (refreshToken: string) => Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }>; keyB64: string; now: () => number }, userId: string): Promise<string>`; sem conexão ⇒ `ApiError(401,"spotify_not_connected")`; conexão expirada ⇒ `ApiError(401,"spotify_expired")`

- [ ] **Step 1: Escrever os testes.** `crypto`: round-trip; dois `encrypt` do mesmo texto diferem; `decrypt` de texto adulterado (um byte trocado) lança; chave errada lança. `tokens`: token ainda válido (>60 s) é devolvido sem chamar `refresh`; token a vencer chama `refresh` e grava com `saveIfRefreshTokenIs`; **duas chamadas simultâneas** com a mesma conexão vencida: uma grava, a outra recebe `false`, relê e devolve o token novo (um único `refresh` efetivo ou resultado consistente); `refresh` rejeitando com `invalid_grant` chama `markExpired` e lança `spotify_expired`; chamada seguinte com conexão `expired` lança sem chamar `refresh`.
- [ ] **Step 2–4:** FAIL, implementar (margem de 60 s, igual ao `EXPIRY_MARGIN_MS` do código atual), PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(worker): cifra e renovação de token do Spotify"`.

### Task 10: Rotas do Spotify por usuário

**Files:**
- Create: `backend/src/spotify/oauth.ts`, `backend/src/spotify/store.ts`, `backend/src/routes/spotify.ts`
- Test: `backend/src/spotify/oauth.test.ts`
- Modify: `backend/src/worker.ts`

**Interfaces:**
- Consumes: `getValidAccessToken`, `serviceDb`, `encrypt`.
- Produces:
  - `store.ts`: `createSpotifyStore(db: SupabaseClient, keyB64: string): SpotifyStore` (implementação sobre `spotify_connections`)
  - `oauth.ts`: `buildAuthorizeUrl(params: { clientId: string; redirectUri: string; scopes: string[]; state: string; challenge: string }): string`; `createState(db, userId, now): Promise<{ state: string; url: string }>` (gera `code_verifier` PKCE e grava em `spotify_oauth_states`); `consumeState(db, state, userId, now): Promise<string /* code_verifier */>` (apaga a linha; estado inexistente, de outro usuário ou com mais de 10 minutos ⇒ `ApiError(400,"invalid_state")`)
  - `spotifyRoutes(deps)`: `POST /spotify/connect` → `{ url }`; `POST /spotify/callback` `{ code, state }`; `POST /spotify/connection` `{ accessToken, refreshToken, expiresIn }` (login com Spotify; busca `GET /me` do Spotify para `spotify_user_id`, `spotify_name`, `product`); `GET /spotify/status` → `{ connected, status: "connected" | "expired" | "disconnected", name, product, connectedAt, devices }`; `DELETE /spotify/connection`; `GET /spotify/currently-playing`, `/spotify/devices`; `PUT /spotify/play|pause`; `POST /spotify/next|previous` (mesmas respostas de `backend/src/functions/spotify.ts`).

- [ ] **Step 1: Escrever `oauth.test.ts`:** `buildAuthorizeUrl` contém `code_challenge_method=S256`, os quatro escopos e o `redirect_uri` exato; `consumeState` com estado de 11 minutos ⇒ 400 `invalid_state`; com o `state` de outro usuário ⇒ 400 e a linha **não** é apagada; reutilizar o mesmo `state` duas vezes ⇒ segundo uso falha.
- [ ] **Step 2–4:** FAIL, implementar (reaproveitar a lógica PKCE de `backend/src/plugins/spotify.ts`), PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(worker): Spotify por usuário"`.

### Task 11: Fundação do frontend (Supabase, proxy, cliente da API, cache por usuário)

**Files:**
- Create: `frontend/src/lib/supabase/server.ts`, `frontend/src/lib/supabase/browser.ts`, `frontend/src/lib/session.ts`, `frontend/src/proxy.ts`, `frontend/vitest.config.ts`
- Modify: `frontend/package.json` (`@supabase/ssr`, `@supabase/supabase-js`, dev `vitest`; script `test`), `frontend/src/lib/api/client.ts`, `frontend/src/lib/api/books.ts`, `frontend/src/lib/api/sessions.ts`, `frontend/src/app/actions.ts`, `frontend/next.config.ts` (remover `rewrites` e `API_URL` padrão de localhost), `frontend/.env.example`
- Create: grupos de rotas `frontend/src/app/(app)/…` (mover páginas existentes) e `frontend/src/app/(auth)/layout.tsx` (sem sidebar)
- Test: `frontend/src/lib/session.test.ts`

**Interfaces:**
- Produces:
  - `createSupabaseServerClient(): Promise<SupabaseClient>` (cookies via `next/headers`) e `createSupabaseBrowserClient(): SupabaseClient`
  - `requireUser(): Promise<{ user: { id: string; email: string | null }; accessToken: string }>` (sem sessão ⇒ `redirect("/entrar")`)
  - `safeNextPath(value: string | null | undefined): string` (aceita só caminhos que começam com `/` e não com `//` nem contêm `\`; senão `/`)
  - `booksTag(userId: string): string` ⇒ `books:${userId}`; `sessionsTag(userId: string): string` ⇒ `sessions:${userId}`
  - `api<T>(path: string, init?: RequestInit & { token: string }): Promise<T>` (envia `Authorization: Bearer`; 401 do Worker ⇒ `redirect("/entrar")`)
  - `getAllBooks(): Promise<Book[]>` e `getAllSessions(): Promise<ReadingSession[]>` **mantêm a assinatura atual**, implementadas com `'use cache: private'` lendo a sessão e `cacheTag(booksTag(user.id))`/`cacheTag(sessionsTag(user.id))`

- [ ] **Step 1: Escrever `session.test.ts`:** `safeNextPath("/biblioteca?x=1")` ⇒ `/biblioteca?x=1`; `safeNextPath("https://evil.com")`, `"//evil.com"`, `"/\\evil.com"`, `""`, `null`, `undefined` ⇒ `/`.
- [ ] **Step 2: Rodar** `cd frontend && bunx vitest run` ⇒ FAIL.
- [ ] **Step 3: Implementar** os módulos; `proxy.ts` renova a sessão do Supabase a cada requisição e redireciona para `/entrar?next=<caminho>` quem não tem sessão, exceto rotas públicas (`/entrar`, `/cadastrar`, `/confirmar-email`, `/esqueci-senha`, `/redefinir-senha`, `/auth/callback`, `/termos`, `/privacidade`); mover as páginas atuais para `(app)` sem mudar URLs; trocar `updateTag(BOOKS_TAG)` das actions por `updateTag(booksTag(user.id))` (idem sessões). Confirmar a sintaxe do `proxy.ts` na doc do Next.
- [ ] **Step 4: Verificar.** `bunx vitest run` ⇒ PASS; `bun run lint && bunx tsc --noEmit` ⇒ limpos. Com `API_URL` apontando para `wrangler dev` e duas contas de teste criadas no Supabase: A cria um livro e vê o livro na biblioteca na hora; B (outra sessão) vê a biblioteca vazia; B nunca vê o livro de A. Se houver dado velho ou cruzado, remover `use cache` das duas funções e usar `cache()` do React por requisição, mantendo o resto igual, e repetir o teste.
- [ ] **Step 5: Commit** — `git commit -m "feat(web): sessão Supabase, proxy e cache por usuário"`.

### Task 12: Telas de autenticação

**Files:**
- Create: `frontend/src/app/(auth)/entrar/page.tsx`, `cadastrar/page.tsx`, `confirmar-email/page.tsx`, `esqueci-senha/page.tsx`, `redefinir-senha/page.tsx`, `frontend/src/app/auth/callback/route.ts`, `frontend/src/features/auth/` (formulários, `auth-card.tsx`, `social-buttons.tsx`, `password-strength.tsx`, `turnstile.tsx`), `frontend/src/app/(auth)/actions.ts`
- Create: `frontend/src/lib/auth-validation.ts`
- Test: `frontend/src/lib/auth-validation.test.ts`, `frontend/src/app/auth/callback/route.test.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient`, `safeNextPath`.
- Produces:
  - `validateEmail(value: string): string | null`, `validatePassword(value: string): string | null` (mínimo 8), `passwordStrength(value: string): 0 | 1 | 2 | 3 | 4`, `validatePasswordMatch(a: string, b: string): string | null` (mensagens em PT-BR do design)
  - server actions `signInAction(formData)`, `signUpAction(formData)`, `forgotPasswordAction(formData)`, `resetPasswordAction(formData)`, `signInWithProviderAction(provider: "google" | "spotify")`, `resendConfirmationAction(email: string)`; cada uma devolve `{ ok: true } | { ok: false; code: "invalid_credentials" | "email_in_use" | "rate_limited" | "provider_error" | "validation"; fieldErrors?: Record<string,string> }`
  - `GET /auth/callback`: troca `code` por sessão; com provedor Spotify, envia `provider_token`/`provider_refresh_token` a `POST /spotify/connection` do Worker; redireciona para `safeNextPath(next)`; falha ⇒ `/entrar?erro=provedor`

- [ ] **Step 1: Escrever os testes.** `auth-validation`: `validatePassword("1234567")` ⇒ mensagem de mínimo 8; `"12345678"` ⇒ `null`; `passwordStrength("abc")` ⇒ 0 ou 1 e `passwordStrength("Abcdef12!x")` ⇒ 4; `validatePasswordMatch("a","b")` ⇒ mensagem "As senhas não conferem". `callback/route.test.ts` (Vitest com cliente Supabase simulado): `next=https://evil.com` ⇒ redireciona para `/`; `next=/biblioteca` ⇒ `/biblioteca`; troca de código com erro ⇒ `/entrar?erro=provedor`.
- [ ] **Step 2: Rodar** ⇒ FAIL. **Step 3: Implementar** as telas fiéis aos frames `Auth — *` (estados: padrão, campos inválidos, erro de credenciais, muitas tentativas, erro de provedor, carregando; versões celular e tema escuro vêm dos tokens e do layout responsivo do `(auth)`). Turnstile via widget com `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, token passado ao Supabase em `options.captchaToken`. Cadastro: se `data.user.identities` vier vazio, devolver `email_in_use` (decisão da spec, seção 6).
- [ ] **Step 4: Verificar.** `bunx vitest run` ⇒ PASS; lint e `tsc` limpos; no navegador: cadastrar com e-mail ⇒ tela "Confira sua caixa de entrada"; entrar com senha errada ⇒ "E-mail ou senha incorretos".
- [ ] **Step 5: Commit** — `git commit -m "feat(web): telas de autenticação"`.

### Task 13: Sidebar com bloco de usuário e saída

**Files:**
- Create: `frontend/src/components/layout/user-menu.tsx`
- Modify: `frontend/src/components/layout/sidebar.tsx`, `frontend/src/app/(app)/layout.tsx`
- Create: `frontend/src/lib/api/me.ts` (`getMe(): Promise<Me>`)
- Test: `frontend/src/lib/initials.test.ts`

**Interfaces:**
- Produces: `type Me = { id: string; email: string | null; displayName: string; yearlyGoal: number; showMiniPlayer: boolean; providers: string[] }`; `getMe()` chama `GET /me`; `initialsOf(name: string): string` (duas primeiras iniciais maiúsculas, `"?"` se vazio); `signOutAction(): Promise<void>` (encerra a sessão e redireciona para `/entrar`).

- [ ] **Step 1: Escrever `initials.test.ts`:** `initialsOf("Pedro Silva")` ⇒ `PS`; `initialsOf("pedro")` ⇒ `P`; `initialsOf("  ")` ⇒ `?`.
- [ ] **Step 2–4:** FAIL, implementar o bloco de usuário e o menu (frames `Sidebar — conta do usuário`: "Minha conta", "Configurações", "Sair"), PASS; lint e `tsc`.
- [ ] **Step 5: Commit** — `git commit -m "feat(web): bloco de usuário e saída"`.

### Task 14: Spotify no frontend

**Files:**
- Create: `frontend/src/app/api/spotify/[...path]/route.ts`, `frontend/src/app/(app)/spotify/retorno/page.tsx`, `frontend/src/features/settings/spotify-card.tsx`
- Modify: `frontend/src/lib/use-spotify.ts`, `frontend/src/components/layout/mini-player.tsx`, `frontend/src/lib/api/integrations.ts`, `frontend/src/features/settings/integrations.tsx`, `frontend/src/features/settings/integration-actions.tsx`
- Test: `frontend/src/lib/use-spotify.test.ts`

**Interfaces:**
- Produces: route handler `/api/spotify/*` que lê a sessão e repassa a chamada ao Worker com `Authorization: Bearer` (sem sessão ⇒ 401); `connectSpotifyAction(): Promise<never>` (pede `POST /spotify/connect` e redireciona o navegador à URL devolvida); página `/spotify/retorno` (estados "conectando", "conectado", "erro") que envia `code` e `state` a `POST /spotify/callback`; `shouldPoll(visibility: DocumentVisibilityState, status: PlayerState["status"]): boolean` (falso com aba oculta e com `disconnected`/`expired`).

- [ ] **Step 1: Escrever `use-spotify.test.ts`:** `shouldPoll("hidden","playing")` ⇒ `false`; `shouldPoll("visible","playing")` ⇒ `true`; `shouldPoll("visible","disconnected")` ⇒ `false`.
- [ ] **Step 2–3:** FAIL, implementar; o mini player usa `/api/spotify/*`, respeita `showMiniPlayer` do perfil, intervalo de 5 s e pausa com `visibilitychange`; Configurações mostra os estados do frame `Configurações — estados do Spotify` (conectado com nome, plano e dispositivos; desconectado; sessão expirada com "Reconectar").
- [ ] **Step 4: Verificar.** `bunx vitest run` PASS; lint e `tsc`; no navegador com a conta de teste: conectar o Spotify, ver "Spotify conectado", ver o mini player com algo tocando, desconectar.
- [ ] **Step 5: Commit** — `git commit -m "feat(web): Spotify por usuário no frontend"`.

### Task 15: Conta, preferências e diálogos

**Files:**
- Create: `frontend/src/features/settings/account-section.tsx`, `login-methods.tsx`, `danger-zone.tsx`, `change-password-dialog.tsx`, `delete-account-dialog.tsx`
- Modify: `frontend/src/app/(app)/configuracoes/page.tsx`, `frontend/src/features/settings/preferences.tsx`, `frontend/src/features/library/delete-book-dialog.tsx`, `frontend/src/app/actions.ts`
- Test: `frontend/src/lib/confirm-word.test.ts`

**Interfaces:**
- Produces: `isDeleteConfirmed(typed: string): boolean` (exatamente `EXCLUIR`, ignorando espaços nas pontas); actions `updateProfileAction(patch: { displayName?: string; yearlyGoal?: number; showMiniPlayer?: boolean })`, `changePasswordAction(current: string, next: string)`, `deleteAccountAction()` (chama `DELETE /me`, encerra a sessão e redireciona para `/entrar`; erro `recent_login_required` ⇒ mensagem pedindo novo login), `linkProviderAction(p: "google"|"spotify")`, `unlinkProviderAction(p)` (não permite remover o único método de login).

- [ ] **Step 1: Escrever `confirm-word.test.ts`:** `"EXCLUIR"` ⇒ `true`; `" EXCLUIR "` ⇒ `true`; `"excluir"`, `"EXCLUI"`, `""` ⇒ `false`.
- [ ] **Step 2–3:** FAIL, implementar conforme `Configurações — conta` e `Diálogos — conta`: remover o cartão do Notion; tema segue no navegador; meta anual e mini player passam a vir do perfil; diálogo de excluir livro com o texto "O livro e as N sessões vinculadas serão apagados permanentemente. Esta ação não pode ser desfeita." (N = sessões do livro).
- [ ] **Step 4: Verificar.** Testes PASS; lint e `tsc`; no navegador: editar nome e meta (persistem após recarregar), alterar senha, botão de excluir conta desabilitado até digitar `EXCLUIR`.
- [ ] **Step 5: Commit** — `git commit -m "feat(web): conta, preferências e diálogos"`.

### Task 16: Dashboard de primeiro acesso

**Files:**
- Create: `frontend/src/features/dashboard/first-steps.tsx`
- Modify: `frontend/src/app/(app)/page.tsx`, `frontend/src/lib/domain/dashboard.ts`
- Test: `frontend/src/lib/domain/first-steps.test.ts`

**Interfaces:**
- Produces: `firstSteps(input: { books: number; sessions: number; spotifyConnected: boolean }): { id: "book" | "session" | "spotify"; done: boolean }[]` (sempre três itens, nessa ordem); `isFirstAccess(books: number, sessions: number): boolean` (verdadeiro só com 0 livros e 0 sessões).

- [ ] **Step 1: Escrever `first-steps.test.ts`:** `firstSteps({books:0,sessions:0,spotifyConnected:false})` ⇒ três `done:false`; `{books:1,sessions:0,spotifyConnected:true}` ⇒ `book` e `spotify` concluídos; `isFirstAccess(0,0)` ⇒ `true`, `isFirstAccess(1,0)` ⇒ `false`.
- [ ] **Step 2–4:** FAIL, implementar a tela "Bem-vindo, {nome}" com o checklist do frame `Dashboard — primeiro acesso` (substitui o estado vazio atual), PASS, lint e `tsc`.
- [ ] **Step 5: Commit** — `git commit -m "feat(web): dashboard de primeiro acesso"`.

### Task 17: Importação dos dados do Notion

**Files:**
- Create: `backend/scripts/import-notion.ts`
- Test: `backend/scripts/import-notion.test.ts`

**Interfaces:**
- Consumes: código atual do Notion (`backend/src/functions`, `plugins`, `utils` ainda presentes), `serviceDb`.
- Produces: `planImport(books: Book[], sessions: ReadingSession[], userId: string): { books: BookRow[]; sessions: SessionRow[]; skipped: { id: string; reason: string }[] }` (puro: gera UUIDs, traduz `bookId` do Notion para o novo UUID; sessão com livro ausente vai para `skipped`); `main()` lê `IMPORT_USER_EMAIL`, busca o usuário, grava com a chave de serviço e imprime contagens.

- [ ] **Step 1: Escrever `import-notion.test.ts`:** 2 livros e 1 sessão ligada ao segundo ⇒ sessão importada com `book_id` igual ao UUID novo do segundo livro; sessão cujo `bookId` não existe ⇒ em `skipped` com `reason:"book_not_found"`; todas as linhas com o `user_id` informado; rodar `planImport` duas vezes não repete UUIDs entre execuções (aleatórios) mas mantém a quantidade.
- [ ] **Step 2–3:** FAIL, implementar.
- [ ] **Step 4: Verificar e executar.** `bun test` PASS. Depois de o dono criar a conta: `IMPORT_USER_EMAIL=… bun run backend/scripts/import-notion.ts`; conferir `select count(*) from books where user_id = …` = 2 e `reading_sessions` = 1, e abrir a biblioteca no app.
- [ ] **Step 5: Commit** — `git commit -m "feat(import): script de importação do Notion"`.

### Task 18: Remover o código do Notion e do backend antigo

**Files:**
- Delete: `backend/src/plugins/notion.ts`, `props.ts`, `spotify.ts`, `spotify-store.ts`; `backend/src/functions/*`; `backend/src/utils/*`; `backend/src/index.ts`; `backend/src/config/env.ts`; `backend/scripts/import-notion.ts` e seu teste; `backend/data/`
- Modify: `backend/package.json` (remover `@notionhq/client`, `@elysiajs/openapi` se não usado; script `dev` aponta para `wrangler dev`), `backend/README.md`

**Interfaces:** nenhuma nova.

- [ ] **Step 1: Confirmar a validação da importação** (Tarefa 17, contagens e conferência no app) antes de apagar qualquer coisa.
- [ ] **Step 2: Remover** os arquivos e dependências acima; `grep -rn "notion" backend/src frontend/src` ⇒ sem resultados.
- [ ] **Step 3: Verificar.** `cd backend && bun test` PASS; `bunx wrangler dev --local` sobe e `/health` responde; `cd frontend && bun run lint && bunx tsc --noEmit && bun run build` limpos.
- [ ] **Step 4: Commit** — `git commit -m "chore: remove código do Notion e backend antigo"`.

### Task 19: Implantação e checklist de segurança

**Files:**
- Create: `docs/deploy.md` (passos e variáveis, sem valores secretos)
- Create: `scripts/smoke.ts` (verificação ponta a ponta contra o ambiente publicado)

**Interfaces:**
- Produces: `scripts/smoke.ts` recebe `API_URL`, `A_TOKEN`, `B_TOKEN` e termina com código 0 só se: toda rota do Worker responde 401 sem token; B recebe 404 em `GET/PATCH/DELETE` de livro e sessão de A; `GET /books` de B não contém livros de A.

- [ ] **Step 1: Configurar o Supabase** (Auth: Site URL e Redirect URLs, Google e Spotify habilitados, confirmação de e-mail, SMTP próprio, captcha Turnstile, vínculo manual de identidades) e anotar em `docs/deploy.md`.
- [ ] **Step 2: Consoles externos.** Spotify: URLs de retorno `https://oxuzoobstcjbsavxapua.supabase.co/auth/v1/callback` e `https://<app>/spotify/retorno`; Google Cloud: cliente OAuth com a URL de retorno do Supabase; conferir o limite atual de usuários do Spotify em modo de desenvolvimento.
- [ ] **Step 3: Publicar o Worker.** `wrangler secret put` para `SUPABASE_SERVICE_ROLE_KEY`, `SPOTIFY_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`; variáveis públicas em `wrangler.jsonc`; `bunx wrangler deploy`; domínio `api.<domínio>`; regras de limite de requisições no Cloudflare.
- [ ] **Step 4: Publicar o frontend na Vercel** com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `API_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; domínio `app.<domínio>`; atualizar o Next para a versão corrigida antes do deploy.
- [ ] **Step 5: Rodar `scripts/smoke.ts`** com tokens de duas contas de teste ⇒ código de saída 0; `grep -rn "service_role\|SERVICE_ROLE" frontend/.next` ⇒ sem resultados; `mcp__supabase__get_advisors` (segurança e desempenho) sem alertas críticos.
- [ ] **Step 6: Commit** — `git commit -m "docs: guia de implantação e smoke test"`.
