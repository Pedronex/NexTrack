# Implantação do NexTrack multiusuário

Sem valores secretos: chaves e senhas vivem nos dashboards (Supabase, Cloudflare, Vercel).

## 1. Supabase (projeto `oxuzoobstcjbsavxapua`)

- SQL: migrações em `supabase/migrations/` aplicadas em ordem (`schema` → `progress_functions` → `hardening`).
- Auth → URL Configuration: Site URL `https://track.nexsdev.com.br`; Redirect URLs com
  `https://track.nexsdev.com.br/auth/callback` e `http://localhost:3001/auth/callback` (dev).
- Auth → Providers: Google e Spotify habilitados.
  - Spotify: escopos `user-read-playback-state user-modify-playback-state user-read-currently-playing user-read-private user-read-email`;
    Redirect URL do Spotify `https://oxuzoobstcjbsavxapua.supabase.co/auth/v1/callback`.
- Auth → Email: confirmação de e-mail ligada; SMTP próprio para produção.
- Auth → Captcha: Cloudflare Turnstile (site key em `NEXT_PUBLIC_TURNSTILE_SITE_KEY`).
- Auth → Manual linking: vínculo manual de identidades habilitado.

## 2. Spotify (developer dashboard)

Redirect URIs:
- `https://oxuzoobstcjbsavxapua.supabase.co/auth/v1/callback` (login com Spotify)
- `https://track.nexsdev.com.br/spotify/retorno` (botão "Conectar Spotify")

Modo de desenvolvimento limita usuários liberados: pedir ampliação de cota antes de abrir o cadastro.

## 3. Google (Google Cloud)

Cliente OAuth com a Redirect URL do Supabase (`.../auth/v1/callback`).

## 4. Cloudflare Worker (`api.track.nexsdev.com.br`)

```sh
cd backend
bunx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
bunx wrangler secret put SPOTIFY_CLIENT_SECRET
bunx wrangler secret put TOKEN_ENCRYPTION_KEY  # base64 de 32 bytes (AES-256-GCM)
bunx wrangler deploy
```

Variáveis públicas em `wrangler.jsonc`: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SPOTIFY_CLIENT_ID`, `SPOTIFY_REDIRECT_URI=https://track.nexsdev.com.br/spotify/retorno`.
Regras de limite de requisições no painel do Cloudflare.

## 5. Frontend (Vercel, `track.nexsdev.com.br`)

Variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`API_URL=https://api.track.nexsdev.com.br`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`,
`NEXT_PUBLIC_APP_URL=https://track.nexsdev.com.br`.
Atualizar o Next para a versão com a vulnerabilidade corrigida antes do deploy
(o build avisa; ver recomendação de upgrade).

## 6. Importação dos dados do dono

1. O dono cria a conta no app publicado.
2. `IMPORT_USER_EMAIL=<e-mail> bun run scripts/import-notion.ts` (a partir de `backend/`,
   com `NOTION_*` e `SUPABASE_*` no ambiente).
3. Conferir contagens no banco e a biblioteca no app; só então remover o código do
   Notion (Task 18 do plano).

## 7. Checklist de segurança

- `bun run scripts/smoke.ts` (ver `scripts/smoke.ts`) com tokens de duas contas ⇒ saída 0.
- `grep -rn "service_role\|SERVICE_ROLE" frontend/.next` ⇒ sem resultados.
- Advisors do Supabase (segurança e desempenho) sem alertas além do INFO intencional
  (RLS sem política nas tabelas do Spotify = negado ao navegador).
