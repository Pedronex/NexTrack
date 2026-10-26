const PALETTE = [
  "#4F6A86",
  "#7A5C58",
  "#6E7F6A",
  "#9A6B4F",
  "#8A7550",
  "#5E5873",
  "#3F6B68",
  "#6B5B73",
  "#7B6A4A",
  "#566B5C",
];

const STOPWORDS = new Set(["o", "a", "os", "as", "um", "uma", "de", "do", "da", "dos", "das", "e", "the"]);

function hash(text: string) {
  let h = 0;
  for (const char of text) h = (h * 31 + char.codePointAt(0)!) >>> 0;
  return h;
}

/** Capa gerada: iniciais do título e uma cor estável derivada dele. */
export function coverFor(title: string) {
  const words = title.split(/[\s:–—-]+/).filter(Boolean);
  const significant = words.filter((w) => !STOPWORDS.has(w.toLowerCase()));
  const source = significant.length > 0 ? significant : words;
  const initials = source
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return { initials: initials || "?", color: PALETTE[hash(title) % PALETTE.length] };
}
