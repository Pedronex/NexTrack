/** Regras de validação dos formulários de autenticação (mensagens em PT-BR). */

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return "Informe seu e-mail.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Informe um e-mail válido.";
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return "Informe sua senha.";
  if (value.length < 8) return "A senha precisa de pelo menos 8 caracteres.";
  return null;
}

export function validatePasswordMatch(a: string, b: string): string | null {
  if (!b) return "Confirme sua senha.";
  if (a !== b) return "As senhas não conferem.";
  return null;
}

export function validateName(value: string): string | null {
  if (!value.trim()) return "Informe seu nome.";
  if (value.trim().length < 2) return "Informe seu nome completo ou como prefere ser chamado.";
  return null;
}

/** Força da senha de 0 a 4 (comprimento + variedade de caracteres). */
export function passwordStrength(value: string): 0 | 1 | 2 | 3 | 4 {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z\d]/].filter((re) => re.test(value)).length;
  score += classes >= 3 ? 1 : 0;
  score += classes === 4 && value.length >= 12 ? 1 : 0;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}

export const passwordStrengthLabel: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "Muito fraca",
  1: "Fraca",
  2: "Razoável",
  3: "Forte",
  4: "Muito forte",
};
