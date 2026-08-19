import { CONDITIONS, type CardCategory, type CardCondition } from "./types";

const POKEMON_HINTS = [
  "pokemon",
  "pokémon",
  "pikachu",
  "charizard",
  "mewtwo",
  "mew ",
  "eevee",
  "trainer",
  "pokeball",
  "vstar",
  "vmax",
  "gx",
  "ex card",
  "holo rare",
  "full art",
  "illustration rare",
  "sir ",
];

const MTG_HINTS = [
  "magic the gathering",
  " mtg ",
  "planeswalker",
  "mana value",
  "instant",
  "sorcery",
  "legendary creature",
  "black lotus",
  "lightning bolt",
  "force of will",
];

const YGO_HINTS = [
  "yu-gi-oh",
  "yugioh",
  "yu gi oh",
  "dark magician",
  "blue-eyes",
  "blue eyes white",
  "exodia",
  "spellcaster",
  "trap card",
];

const SPORTS_HINTS = [
  "topps",
  "panini",
  "bowman",
  "prizm",
  "donruss",
  "optic",
  "mosaic",
  "select",
  "upper deck",
  "fleer",
  "chrome",
  "stadium club",
  "allen & ginter",
  "finest",
  "rookie",
  " rc ",
  "psa ",
  "bgs ",
  "nfl",
  "nba",
  "mlb",
  "nhl",
  "fifa",
  "wwe",
  "ufc",
];

const NOISE =
  /^(illus|©|tm|lc|energy|hp|weakness|resistance|retreat|attack|pokemon|magic|the gathering|trading card|score|copyright|produced|nintendo|wizards|konami|panini|topps)$/i;

export function detectCategory(text: string): CardCategory {
  const hay = ` ${text.toLowerCase()} `;
  const score = (hints: string[]) =>
    hints.reduce((total, hint) => total + (hay.includes(hint) ? 1 : 0), 0);

  const ranked: [CardCategory, number][] = [
    ["pokemon", score(POKEMON_HINTS)],
    ["mtg", score(MTG_HINTS)],
    ["yugioh", score(YGO_HINTS)],
    ["sports", score(SPORTS_HINTS)],
  ];
  ranked.sort((a, b) => b[1] - a[1]);
  return ranked[0][1] > 0 ? ranked[0][0] : "other";
}

export function cleanOcrText(raw: string): string {
  return raw
    .replace(/[|]/g, "I")
    .split("\n")
    .map((line) => line.replace(/[^\w\s.&'\-/]/g, " ").replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 3 && !NOISE.test(line))
    .join("\n");
}

export function suggestQuery(raw: string): string {
  const cleaned = cleanOcrText(raw);
  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const year = cleaned.match(/\b(19|20)\d{2}\b/)?.[0];
  const scored = lines
    .map((line) => {
      const words = line.split(" ").filter((word) => word.length > 1);
      const letters = (line.match(/[A-Za-z]/g) || []).length;
      const digits = (line.match(/\d/g) || []).length;
      return {
        line,
        score: letters * 2 + words.length - digits + (line.length > 18 ? 2 : 0),
      };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored
    .slice(0, 4)
    .map((entry) => entry.line)
    .filter((line, index, all) => all.indexOf(line) === index);

  const parts = [...top];
  if (year && !parts.some((part) => part.includes(year))) {
    parts.unshift(year);
  }

  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 120);
}

export function withCondition(query: string, condition: CardCondition): string {
  const suffix = CONDITIONS.find((item) => item.id === condition)?.suffix ?? "";
  return [query.trim(), suffix].filter(Boolean).join(" ");
}

export function categoryLabel(category: CardCategory): string {
  switch (category) {
    case "pokemon":
      return "Pokémon TCG";
    case "mtg":
      return "Magic: The Gathering";
    case "yugioh":
      return "Yu-Gi-Oh!";
    case "sports":
      return "Sports card";
    default:
      return "Trading card";
  }
}
