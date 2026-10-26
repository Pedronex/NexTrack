/** Confirmação de exclusão de conta: exatamente EXCLUIR (ignora espaços nas pontas). */
export function isDeleteConfirmed(typed: string): boolean {
  return typed.trim() === "EXCLUIR";
}
