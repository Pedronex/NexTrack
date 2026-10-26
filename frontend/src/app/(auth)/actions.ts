"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/session";
import { validateEmail, validateName, validatePassword, validatePasswordMatch } from "@/lib/auth-validation";

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_in_use"
  | "rate_limited"
  | "provider_error"
  | "validation";

export type AuthResult =
  | { ok: true }
  | { ok: false; code: AuthErrorCode; message: string; fieldErrors?: Record<string, string> };

const fail = (
  code: AuthErrorCode,
  message: string,
  fieldErrors?: Record<string, string>,
): AuthResult => ({ ok: false, code, message, fieldErrors });

function mapSupabaseError(message: string): { code: AuthErrorCode; message: string } {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials"))
    return { code: "invalid_credentials", message: "E-mail ou senha incorretos." };
  if (m.includes("too many") || m.includes("rate limit") || m.includes("too_many"))
    return { code: "rate_limited", message: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already"))
    return { code: "email_in_use", message: "Este e-mail já está em uso. Entre ou recupere sua senha." };
  if (m.includes("email not confirmed") || m.includes("not confirmed"))
    return { code: "invalid_credentials", message: "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada." };
  return { code: "provider_error", message: "Não foi possível completar. Tente de novo." };
}

function appUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3001";
}

export async function signUpAction(formData: FormData): Promise<AuthResult> {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const captchaToken = String(formData.get("captchaToken") ?? "") || undefined;

  const fieldErrors: Record<string, string> = {};
  const nameError = validateName(name);
  if (nameError) fieldErrors.name = nameError;
  const emailError = validateEmail(email);
  if (emailError) fieldErrors.email = emailError;
  const passwordError = validatePassword(password);
  if (passwordError) fieldErrors.password = passwordError;
  if (Object.keys(fieldErrors).length > 0)
    return fail("validation", "Revise os campos destacados.", fieldErrors);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { display_name: name.trim() },
      emailRedirectTo: `${appUrl()}/auth/callback`,
      captchaToken,
    },
  });
  if (error) {
    const mapped = mapSupabaseError(error.message);
    return fail(mapped.code, mapped.message);
  }
  // Com confirmação de e-mail ligada, um e-mail já cadastrado devolve
  // usuário sem identidades — revela que o e-mail existe (aceito na spec, seção 6).
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return fail("email_in_use", "Este e-mail já está em uso. Entre ou recupere sua senha.");
  }
  return { ok: true };
}

export async function signInAction(formData: FormData, next?: string): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const captchaToken = String(formData.get("captchaToken") ?? "") || undefined;

  const fieldErrors: Record<string, string> = {};
  const emailError = validateEmail(email);
  if (emailError) fieldErrors.email = emailError;
  if (!password) fieldErrors.password = "Informe sua senha.";
  if (Object.keys(fieldErrors).length > 0)
    return fail("validation", "Revise os campos destacados.", fieldErrors);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
    options: { captchaToken },
  });
  if (error) {
    const mapped = mapSupabaseError(error.message);
    return fail(mapped.code, mapped.message);
  }
  redirect(safeNextPath(next));
}

export async function signInWithProviderAction(
  provider: "google" | "spotify",
  next?: string,
): Promise<{ ok: true; url: string } | { ok: false; code: AuthErrorCode; message: string }> {
  const supabase = await createSupabaseServerClient();
  const callback = `${appUrl()}/auth/callback?next=${encodeURIComponent(safeNextPath(next))}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callback,
      ...(provider === "spotify"
        ? {
            scopes:
              "user-read-playback-state user-modify-playback-state user-read-currently-playing user-read-private user-read-email",
          }
        : {}),
    },
  });
  if (error || !data.url) {
    return { ok: false, code: "provider_error", message: "Falha no provedor. Tente de novo." };
  }
  return { ok: true, url: data.url };
}

export async function forgotPasswordAction(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const captchaToken = String(formData.get("captchaToken") ?? "") || undefined;
  const emailError = validateEmail(email);
  if (emailError) return fail("validation", "Revise os campos destacados.", { email: emailError });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent("/redefinir-senha")}`,
    captchaToken,
  });
  if (error) {
    const mapped = mapSupabaseError(error.message);
    if (mapped.code === "rate_limited") return fail(mapped.code, mapped.message);
    // Resposta neutra por padrão (não revela se o e-mail existe).
    return { ok: true };
  }
  return { ok: true };
}

export async function resetPasswordAction(formData: FormData): Promise<AuthResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const fieldErrors: Record<string, string> = {};
  const passwordError = validatePassword(password);
  if (passwordError) fieldErrors.password = passwordError;
  const matchError = validatePasswordMatch(password, confirm);
  if (matchError) fieldErrors.confirm = matchError;
  if (Object.keys(fieldErrors).length > 0)
    return fail("validation", "Revise os campos destacados.", fieldErrors);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const mapped = mapSupabaseError(error.message);
    return fail(mapped.code, mapped.message);
  }
  redirect("/");
}

export async function resendConfirmationAction(email: string): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim(),
    options: { emailRedirectTo: `${appUrl()}/auth/callback` },
  });
  if (error) {
    const mapped = mapSupabaseError(error.message);
    return fail(mapped.code, mapped.message);
  }
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
