import type { Book, BookInput, SessionInput } from "./types";

export type Errors<T> = Partial<Record<keyof T, string>>;

const isInt = (value: number | null | undefined): value is number =>
  value != null && Number.isInteger(value);

export function validateBook(input: BookInput): Errors<BookInput> {
  const errors: Errors<BookInput> = {};
  if (!input.title?.trim()) errors.title = "O título é obrigatório";
  if (input.totalPages != null && (!isInt(input.totalPages) || input.totalPages < 1))
    errors.totalPages = "Mínimo 1";
  if (input.currentPage != null) {
    if (!isInt(input.currentPage) || input.currentPage < 0) errors.currentPage = "Informe um número inteiro";
    else if (input.totalPages != null && input.currentPage > input.totalPages)
      errors.currentPage = "Não pode passar do total de páginas";
  }
  if (input.rating != null && (input.rating < 0 || input.rating > 5))
    errors.rating = "A avaliação vai de 0 a 5";
  if (input.startedAt && input.finishedAt && input.finishedAt < input.startedAt)
    errors.finishedAt = "Anterior ao início";
  return errors;
}

export function validateSession(
  input: SessionInput,
  book: Pick<Book, "totalPages"> | undefined,
): Errors<SessionInput> {
  const errors: Errors<SessionInput> = {};
  if (!input.bookId) errors.bookId = "Escolha o livro";
  if (!input.date) errors.date = "Informe a data";
  if (input.durationMin != null && input.durationMin < 0) errors.durationMin = "Não pode ser negativa";

  const { startPage, endPage } = input;
  if (!isInt(startPage) || startPage < 0) errors.startPage = "Informe a página inicial";
  if (!isInt(endPage)) errors.endPage = "Informe a página final";
  else if (isInt(startPage) && endPage <= startPage) errors.endPage = "Deve ser maior que a inicial";
  else if (book?.totalPages && endPage > book.totalPages) errors.endPage = `Máx. ${book.totalPages}`;

  if (input.spotifyUrl && !URL.canParse(input.spotifyUrl)) errors.spotifyUrl = "Link inválido";
  return errors;
}

export const hasErrors = (errors: object) => Object.keys(errors).length > 0;
