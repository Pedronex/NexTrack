# NexTrack — Autenticação e multiusuário (Supabase + Worker + Vercel)

Data: 2026-10-26 · Status: aguardando revisão

## 1. Objetivo

Hoje o NexTrack é de usuário único: o backend Elysia (Bun) lê e grava no Notion de uma só pessoa (token e IDs de base fixos em `backend/src/config/env.ts`) e guarda um único token do Spotify em arquivo (`backend/data/spotify.db`). O objetivo é publicar o app para qualquer pessoa usar, com **cadastro livre** e **dados isolados por usuário**.

Critérios de sucesso:

- Qualquer pessoa cria conta com **Google, Spotify ou e-mail e senha** e vê apenas os próprios livros, sessões e conexão do Spotify.
- Nenhuma rota da API responde sem um usuário autenticado; um usuário nunca lê nem altera dados de outro, mesmo que o código da API tenha um filtro esquecido (defesa em profundidade via RLS).
- Frontend na Vercel, API em Cloudflare Worker, banco e autenticação no Supabase.
- Os dados atuais do dono (hoje no Notion) são importados para a conta dele.
- As telas novas do `NexTrack.pen` (autenticação, retorno do Spotify, conta, diálogos, primeiro acesso) estão implementadas no frontend.

## 2. Decisões tomadas

| Tema | Decisão |
| --- | --- |
| Armazenamento | Banco próprio no Supabase (Postgres); o Notion deixa de ser usado |
| Autenticação | Supabase Auth: Google, Spotify, e-mail e senha |
| Cadastro | Livre, com confirmação de e-mail, Cloudflare Turnstile e limite de requisições |
| Backend | Cloudflare Worker (Elysia com adaptador do Cloudflare) |
| Frontend | Next 16 na Vercel (mantém `cacheComponents`) |
| Isolamento | JWT do usuário + RLS no Postgres |

Descartado: Better Auth (RLS não funciona de graça com sessão própria); Notion por usuário (exige integração pública e conta no Notion de cada pessoa); filtro por `user_id` só no código (um esquecimento vaza dados).

## 3. Fora do escopo

- Layouts **tablet e celular** do app (os frames existem no Pencil, mas são uma spec separada). As telas de autenticação já nascem responsivas porque têm versão celular no design.
- 2FA, passkeys, times de usuários e sincronização opcional com o Notion.
- Aplicativo mobile (Expo).

## 4. Arquitetura

```
Navegador ──► Next (Vercel) ──Bearer <JWT do usuário>──► Worker (Cloudflare) ──► Supabase Postgres
                 │  sessão em cookie (@supabase/ssr)            │  valida JWT (JWKS)        (RLS por auth.uid())
                 └──► Supabase Auth (login, OAuth, e-mail)      └──► Spotify Web API
```

- O navegador nunca chama o Worker diretamente. O servidor do Next lê a sessão do cookie e repassa o token. Por isso não há CORS, e o `rewrites` atual (`/backend/*`) é removido.
- O mini player (consulta a cada 5 s) usa um route handler do Next (`/api/spotify/*`) que anexa o token. A consulta pausa com a aba oculta.
- Um `proxy.ts` do Next (convenção do Next 16; confirmar na doc ao implementar) redireciona para `/entrar` quem não tem sessão. Rotas públicas: `/entrar`, `/cadastrar`, `/confirmar-email`, `/esqueci-senha`, `/redefinir-senha`, `/auth/callback`, termos e privacidade.
- Grupos de rotas: `(auth)` (layout sem sidebar) e `(app)` (layout atual com sidebar).

## 5. Banco de dados (Supabase)

Todas as tabelas de dados têm `user_id uuid not null default auth.uid() references auth.users on delete cascade` e RLS ligado.

**`profiles`**: `user_id` (PK), `display_name`, `yearly_goal int default 24`, `show_mini_player bool default true`, `created_at`. Criada por um trigger `handle_new_user` no cadastro (nome vindo do formulário ou do provedor).

**`books`**: `id uuid` (PK), `title text not null`, `author`, `status` (`Quero ler | Lendo | Pausado | Concluído | Abandonado`), `format` (`Físico | Digital | E-Book | Audiobook`), `current_page int default 0`, `total_pages int`, `started_at date`, `finished_at date`, `rating numeric`, `isbn`, `created_at`, `updated_at`. Restrições: `current_page >= 0`, `total_pages >= 1`, `current_page <= total_pages`, `rating between 0 and 5`, `finished_at >= started_at`. `unique (id, user_id)` para a chave composta abaixo.

**`reading_sessions`**: `id uuid`, `book_id`, `title`, `date date not null`, `start_page`, `end_page`, `pages_read`, `duration_min`, `spotify_url`, `notes`, `created_at`. Chave estrangeira composta `(book_id, user_id) → books (id, user_id) on delete cascade`: impossível apontar para livro de outra pessoa. Excluir um livro apaga as sessões dele.

**`spotify_connections`**: `user_id` (PK), `access_token_enc`, `refresh_token_enc`, `expires_at`, `scope`, `spotify_user_id`, `spotify_name`, `product` (plano, ex.: `premium`), `connected_at`.

**`spotify_oauth_states`**: `state` (PK), `user_id`, `code_verifier`, `created_at`; linhas com mais de 10 minutos são ignoradas e limpas.

**Índices**: `books (user_id, status)`, `reading_sessions (user_id, date desc)`, `reading_sessions (book_id)`.

**Políticas RLS**
- `profiles`, `books`, `reading_sessions`: `for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())`.
- `spotify_connections` e `spotify_oauth_states`: RLS ligado **sem política** para `anon` e `authenticated` (negado ao navegador). Só o Worker acessa, com a chave de serviço, sempre filtrando pelo `user_id` verificado do JWT.
- Tokens do Spotify gravados cifrados (AES-GCM, segredo do Worker).

**Função `register_session(...)`** (`security invoker`, numa única transação): insere a sessão e atualiza o livro. Regras migradas de `applyProgress`: a página atual só avança (`greatest`); o status vira `Lendo` quando era `Quero ler`, `Pausado` ou nulo, e `Concluído` ao atingir `total_pages`; `started_at` é preenchida se vazia e o livro passa a `Lendo`/`Concluído`; `finished_at` é preenchida ao concluir; `pages_read = end_page - start_page` quando não informado. Devolve a sessão e o livro atualizados.

**Função `update_progress(book_id, page, status?)`**: mesma lógica sem criar sessão (atualização rápida do detalhe).

## 6. Fluxos de autenticação

- **E-mail e senha:** server actions do Next chamam o Supabase (`signUp`, `signInWithPassword`, `resetPasswordForEmail`, `updateUser`). Confirmação de e-mail obrigatória. Senha com mínimo de 8 caracteres e indicador de força na interface.
- **Google e Spotify:** `signInWithOAuth`; o retorno cai em `/auth/callback`, que troca o `code` por sessão e redireciona para `/`. Quando o provedor é o Spotify, o callback também envia `provider_token` e `provider_refresh_token` ao Worker (o Supabase não os guarda), com os escopos de reprodução e `user-read-private`.
- **Anti-bot:** Turnstile no captcha do Supabase Auth (cadastro, login e recuperação) e regras de limite de requisições do Cloudflare para o Worker.
- **Mensagens de erro:** conforme o design (credenciais incorretas, muitas tentativas, falha no provedor).
- **A confirmar na revisão:** o frame "Criar conta — e-mail já em uso" revela que o e-mail existe. O Supabase com confirmação ligada devolve um usuário sem identidades nesse caso, o que permite mostrar a mensagem, mas é enumeração de contas. Seguimos o design e aceitamos esse risco, ou trocamos por uma mensagem neutra ("enviamos um e-mail de confirmação").

## 7. Worker

Estrutura de `backend/`:

- `src/index.ts`: entrada do Worker (Elysia com o adaptador do Cloudflare; `compatibility_flags = ["nodejs_compat"]`). Detalhes do adaptador confirmados na doc ao implementar.
- `src/auth/`: valida o JWT com as chaves públicas do projeto (JWKS cacheado, `jose`), conferindo `iss`, `aud = authenticated` e `exp`; entrega `user.id`. Sem token válido: 401 `{ error, code }`.
- `src/db/`: cliente Supabase **por requisição** usando o token do usuário (RLS vale); cliente de serviço só para as tabelas do Spotify e para excluir conta.
- `src/routes/`: `books`, `sessions`, `spotify`, `account`.
- `src/lib/crypto.ts`: AES-GCM.
- `src/config/env.ts`: valida os bindings com zod.

Segredos (`wrangler secret put`): `SUPABASE_SERVICE_ROLE_KEY`, `SPOTIFY_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`. Variáveis: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_REDIRECT_URI`.

**Contrato da API.** Mesmos endpoints e mesmo JSON de hoje (`Book`, `ReadingSession`, camelCase), com IDs UUID:

- `GET/POST /books`, `GET/PATCH/DELETE /books/:id`, `PATCH /books/:id/progress`
- `GET/POST /sessions`, `GET/PATCH/DELETE /sessions/:id` (`POST` usa `register_session`)
- `GET/PATCH /me` (perfil: nome, meta anual, mini player)
- `DELETE /me`: exige sessão com login feito nos últimos 15 minutos (contas só com Google ou Spotify não têm senha; a confirmação na interface é digitar `EXCLUIR`), apaga o usuário com a API administrativa do Supabase (a cascata remove todos os dados) e responde 204
- Spotify: `POST /spotify/connect` (gera `state`, devolve a URL de autorização), `POST /spotify/callback` (troca `code`+`state`, grava tokens cifrados), `POST /spotify/connection` (grava tokens vindos do login com Spotify), `GET /spotify/status`, `DELETE /spotify/connection`, `GET /spotify/currently-playing`, `GET /spotify/devices`, `PUT /spotify/play|pause`, `POST /spotify/next|previous`

**Spotify por usuário.** O `redirect_uri` do botão "Conectar Spotify" aponta para `/spotify/retorno` **do Next**, que repassa `code` e `state` ao Worker já autenticado (telas "conectando", "conectado" e "erro" do design). A renovação do token usa gravação condicional (só atualiza se o refresh token ainda é o lido), evitando corrida entre chamadas simultâneas. Se o refresh falhar de forma definitiva, o status passa a `expired` e a tela de Configurações mostra "Sessão do Spotify expirada" com "Reconectar".

**Erros:** formato único `{ error, code }`. Violação de RLS ou de chave estrangeira vira 404 ou 400; erros do Spotify seguem como hoje; nenhum token nos logs.

## 8. Frontend

Mudanças em `frontend/src`:

- `lib/supabase/` (clientes servidor, navegador e `proxy`), `proxy.ts` na raiz de `src`.
- `lib/api/client.ts` passa a ler o token da sessão e enviar `Authorization: Bearer`. As funções de leitura (`getAllBooks`, `getAllSessions`) viram **por usuário**: o `"use cache"` ganha o `user_id` como argumento e tags `books:<id>`/`sessions:<id>` (hoje a tag é global, o que vazaria dados entre usuários).
- Telas de autenticação (frames `Auth — *`, incluindo estados de erro, carregando, celular e tema escuro): `/entrar`, `/cadastrar`, `/confirmar-email`, `/esqueci-senha`, `/redefinir-senha`.
- `/spotify/retorno` (frames `Spotify — retorno — *`).
- Sidebar: bloco de usuário e menu (frame `Sidebar — conta do usuário`); mini player controlado pela preferência `show_mini_player`.
- Configurações (`Configurações — conta`, `— estados do Spotify`): Conta (nome, e-mail verificado, alterar senha, métodos de login com Google/Spotify/e-mail via vínculo de identidades do Supabase, que precisa estar habilitado no projeto), Integrações (só Spotify, com nome e plano da conta), Preferências (tema, meta anual e mini player agora no perfil), Zona de risco. O cartão do Notion sai.
- Diálogos (`Diálogos — conta`): excluir conta (digitar `EXCLUIR`), alterar senha. Diálogo de excluir livro com o texto novo (apaga as sessões).
- Dashboard de primeiro acesso (`Dashboard — primeiro acesso`): checklist com três passos calculados (tem livro, tem sessão, Spotify conectado).
- Variáveis de ambiente do Next: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `API_URL` (URL do Worker), `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.

## 9. Migração dos dados atuais

Script único `backend/scripts/import-notion.ts` (descartável): lê livros e sessões do Notion com o código atual, grava na conta do dono com a chave de serviço (depois de ele se cadastrar) e traduz os IDs do Notion para UUIDs ao refazer o relacionamento sessão → livro. Roda uma vez e é validado por contagem e amostra. Em seguida, o código do Notion, `spotify-store`, `mappers` e `props` são removidos do backend. O token do Spotify atual não é migrado: o dono reconecta o Spotify na nova conta.

## 10. Implantação

- **Supabase:** Site URL e Redirect URLs (domínio do app e `/auth/callback`); provedores Google e Spotify habilitados; confirmação de e-mail ligada; SMTP próprio para produção (o padrão é muito limitado); captcha com Turnstile; vínculo manual de identidades habilitado.
- **Spotify (painel de desenvolvedor):** duas URLs de retorno: `https://oxuzoobstcjbsavxapua.supabase.co/auth/v1/callback` e `https://<app>/spotify/retorno`. O modo de desenvolvimento do Spotify limita os usuários liberados; confirmar o limite atual e, se necessário, pedir a ampliação de cota antes de abrir o cadastro.
- **Google:** cliente OAuth no Google Cloud com a URL de retorno do Supabase.
- **Cloudflare:** Worker em `api.<domínio>`; regras de limite de requisições; DNS do app apontando para a Vercel (CNAME).
- **Vercel:** projeto do `frontend`, variáveis de ambiente, domínio `app.<domínio>`.
- Upgrade do Next antes de publicar (o `dev` e o `build` avisaram de vulnerabilidade conhecida na 16.4.0).

## 11. Testes

- **Banco:** testes SQL com dois usuários (RLS impede ler, alterar e apagar linhas do outro; chave composta impede sessão em livro alheio; `register_session` e `update_progress` cobrem avanço, conclusão, status e datas; tabelas do Spotify negadas ao navegador).
- **Worker:** testes unitários de validação de JWT (assinatura, `exp`, `aud`, `iss`), cifra AES-GCM, renovação condicional de token e mapeamento de erros.
- **Frontend:** testes das regras de validação (senha, campos) e do cálculo do checklist; verificação manual no navegador dos fluxos de cadastro, login (três métodos), recuperação de senha, conexão do Spotify e exclusão de conta.
- **Segurança:** conferência de que nenhuma rota do Worker responde sem token e de que a chave de serviço não aparece em nenhum bundle do frontend.

## 12. Ordem de execução (para o plano)

1. Esquema, RLS, funções SQL e testes (via MCP/migrações versionadas em `supabase/migrations`).
2. Worker: autenticação, `books`, `sessions`, `me`.
3. Frontend: clientes Supabase, `proxy.ts`, telas de autenticação, cache por usuário.
4. Spotify por usuário (Worker + retorno + mini player + Configurações).
5. Conta, preferências, primeiro acesso, diálogos.
6. Importação dos dados, remoção do código do Notion, implantação e checklist de segurança.

## 13. Riscos

- Suporte do adaptador Elysia/Cloudflare e de `nodejs_compat` a todas as dependências do Worker (mitigação: spike no passo 2).
- Limite de usuários do Spotify em modo de desenvolvimento (mitigação: pedir ampliação; o login com e-mail e Google funciona sem Spotify).
- Cota de e-mails do Supabase no cadastro livre (mitigação: SMTP próprio).
- Enumeração de contas pela mensagem "e-mail já em uso" (decisão pendente na seção 6).
