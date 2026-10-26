/** Checklist de primeiro acesso do dashboard (três passos, sempre nessa ordem). */

export interface FirstStep {
  id: "book" | "session" | "spotify";
  done: boolean;
}

export function firstSteps(input: {
  books: number;
  sessions: number;
  spotifyConnected: boolean;
}): FirstStep[] {
  return [
    { id: "book", done: input.books > 0 },
    { id: "session", done: input.sessions > 0 },
    { id: "spotify", done: input.spotifyConnected },
  ];
}

/** Verdadeiro só quando ainda não há nenhum livro nem sessão. */
export function isFirstAccess(books: number, sessions: number): boolean {
  return books === 0 && sessions === 0;
}
