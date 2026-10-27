export interface AuthNotice {
  /** "info" = ação do usuário resolve (ex.: confirmar e-mail); "error" = falha. */
  tone: "info" | "error";
  message: string;
}

const GENERIC: AuthNotice = { tone: "error", message: "Falha no provedor. Tente de novo." };

const BY_CODE: Record<string, AuthNotice> = {
  // O Spotify não verifica e-mails: o Supabase cria a conta e pede a confirmação antes de liberar o acesso.
  provider_email_needs_verification: {
    tone: "info",
    message:
      "Quase lá! Enviamos um e-mail de confirmação para o e-mail da sua conta no provedor. Clique no link da mensagem e depois entre de novo.",
  },
  email_exists: {
    tone: "error",
    message:
      "Já existe uma conta com esse e-mail. Entre com o método que você usou ao criar a conta e vincule este provedor em Configurações.",
  },
  identity_already_exists: {
    tone: "error",
    message: "Essa conta do provedor já está vinculada a outro usuário.",
  },
  over_request_rate_limit: {
    tone: "error",
    message: "Muitas tentativas. Tente de novo em alguns minutos.",
  },
  over_email_send_rate_limit: {
    tone: "error",
    message: "Muitos e-mails enviados. Tente de novo em alguns minutos.",
  },
};

/**
 * Lê o erro devolvido pelo Supabase/provedor. Aceita o fragmento (`#error=…&error_code=…`)
 * ou a query string (`?erro=provedor&error_code=…`) e devolve um aviso em português,
 * sem expor o texto técnico do provedor.
 */
export function parseAuthRedirectError(hashOrSearch: string): AuthNotice | null {
  const params = new URLSearchParams(hashOrSearch.replace(/^[#?]/, ""));
  const code = params.get("error_code");
  if (code && BY_CODE[code]) return BY_CODE[code];
  if (code || params.has("error") || params.get("erro") === "provedor") return GENERIC;
  return null;
}
