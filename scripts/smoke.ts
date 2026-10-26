/**
 * Smoke test do ambiente publicado (Task 19).
 * Uso: bun run scripts/smoke.ts <API_URL> <A_TOKEN> <B_TOKEN>
 * Saída 0 só se: tudo responde 401 sem token; B recebe 404 em livro/sessão de A;
 * GET /books de B não contém livros de A.
 */
const [API_URL, A_TOKEN, B_TOKEN] = process.argv.slice(2);
if (!API_URL || !A_TOKEN || !B_TOKEN) {
  console.error("Uso: bun run scripts/smoke.ts <API_URL> <A_TOKEN> <B_TOKEN>");
  process.exit(2);
}

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "ok" : "FALHOU"} - ${name}${detail && !cond ? ` (${detail})` : ""}`);
  if (!cond) failures += 1;
}

async function req(path: string, token?: string, init: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

// 1. Toda rota responde 401 sem token
for (const [method, path, body] of [
  ["GET", "/books"],
  ["GET", "/sessions"],
  ["GET", "/me"],
  ["GET", "/spotify/status"],
  ["POST", "/books", { title: "x" }],
  ["POST", "/sessions", { title: "x" }],
  ["DELETE", "/me"],
] as const) {
  const { status } = await req(path, undefined, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
  check(`${method} ${path} sem token ⇒ 401`, status === 401, `veio ${status}`);
}

// 2. A cria livro + sessão
const created = await req("/books", A_TOKEN, {
  method: "POST",
  body: JSON.stringify({ title: "Smoke" }),
});
check("A cria livro (201)", created.status === 201, `veio ${created.status}`);
const bookId = (created.body as { id?: string } | null)?.id;
if (!bookId) {
  console.error("Sem bookId, abortando.");
  process.exit(1);
}
const session = await req("/sessions", A_TOKEN, {
  method: "POST",
  body: JSON.stringify({ title: "S", bookId, date: "2026-01-01", startPage: 0, endPage: 5 }),
});
check("A cria sessão (201)", session.status === 201, `veio ${session.status}`);
const sessionId = (session.body as { id?: string } | null)?.id;

// 3. B recebe 404 em livro/sessão de A
for (const [method, path] of [
  ["GET", `/books/${bookId}`],
  ["PATCH", `/books/${bookId}`],
  ["DELETE", `/books/${bookId}`],
  ["GET", `/sessions/${sessionId}`],
  ["DELETE", `/sessions/${sessionId}`],
] as const) {
  const { status } = await req(path, B_TOKEN, {
    method,
    body: method === "PATCH" ? JSON.stringify({ title: "hack" }) : undefined,
  });
  check(`${method} ${path.split("/")[1]}/:id de A com B ⇒ 404`, status === 404, `veio ${status}`);
}

// 4. GET /books de B não contém livros de A
const listB = await req("/books?limit=100", B_TOKEN);
const booksB = ((listB.body as { data?: { id: string }[] } | null)?.data ?? []).map((b) => b.id);
check("lista de B sem livros de A", !booksB.includes(bookId));

// 5. Limpeza
await req(`/sessions/${sessionId}`, A_TOKEN, { method: "DELETE" });
const cleanup = await req(`/books/${bookId}`, A_TOKEN, { method: "DELETE" });
check("limpeza (A apaga o livro)", cleanup.status === 200, `veio ${cleanup.status}`);

process.exit(failures === 0 ? 0 : 1);
