import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/session";

const API_URL = process.env.API_URL;

/** Troca o code do provedor por sessão; com Spotify, envia os tokens ao Worker. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const next = safeNextPath(params.get("next"));
  const fail = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    url.searchParams.set("erro", "provedor");
    return NextResponse.redirect(url);
  };

  if (!code) return fail();

  let response = NextResponse.redirect(new URL(next, request.url));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.redirect(new URL(next, request.url));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (
    session?.user.app_metadata?.provider === "spotify" &&
    session.provider_token &&
    session.provider_refresh_token &&
    API_URL
  ) {
    // O Supabase não guarda provider tokens: repassa ao Worker (não bloqueia o login).
    await fetch(`${API_URL}/spotify/connection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        accessToken: session.provider_token,
        refreshToken: session.provider_refresh_token,
        // O provedor não informa a validade: tokens do Spotify duram 1h.
        expiresIn: 3600,
      }),
    }).catch(() => null);
  }

  return response;
}
