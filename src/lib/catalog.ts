import type { CardCategory, IdentifiedCard } from "./types";
import { detectCategory, suggestQuery } from "./query";

interface PokemonCard {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  set?: { name?: string };
  images?: { small?: string; large?: string };
  tcgplayer?: {
    prices?: Record<string, { market?: number; mid?: number; low?: number }>;
  };
  cardmarket?: { prices?: { averageSellPrice?: number; trendPrice?: number } };
}

interface ScryfallCard {
  name: string;
  set_name?: string;
  collector_number?: string;
  rarity?: string;
  image_uris?: { normal?: string; small?: string };
  card_faces?: { image_uris?: { normal?: string } }[];
  prices?: { usd?: string | null; usd_foil?: string | null };
}

interface YgoCard {
  name: string;
  type?: string;
  race?: string;
  card_images?: { image_url?: string }[];
  card_prices?: {
    tcgplayer_price?: string;
    ebay_price?: string;
    amazon_price?: string;
    cardmarket_price?: string;
  }[];
}

function firstPrice(values: Array<number | undefined | null>): number | undefined {
  return values.find((value) => value != null && value > 0) ?? undefined;
}

async function searchPokemon(query: string): Promise<IdentifiedCard[]> {
  const name = query.split(" ").slice(0, 4).join(" ");
  const url = `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(
    name.replace(/"/g, ""),
  )}"&pageSize=6`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return [];
  const json = (await response.json()) as { data?: PokemonCard[] };
  return (json.data ?? []).map((card) => {
    const prices = card.tcgplayer?.prices ?? {};
    const market = firstPrice(
      Object.values(prices).flatMap((entry) => [
        entry.market,
        entry.mid,
        entry.low,
      ]),
    );
    const cm = firstPrice([
      card.cardmarket?.prices?.trendPrice,
      card.cardmarket?.prices?.averageSellPrice,
    ]);
    return {
      name: card.name,
      setName: card.set?.name,
      number: card.number,
      rarity: card.rarity,
      category: "pokemon" as const,
      imageUrl: card.images?.large || card.images?.small,
      catalogPrice: market ?? cm,
      catalogLabel: market ? "TCGPlayer market" : cm ? "Cardmarket trend" : undefined,
      details: [card.set?.name, card.number && `#${card.number}`, card.rarity]
        .filter(Boolean)
        .join(" · "),
      query: [card.name, card.set?.name, card.number].filter(Boolean).join(" "),
    };
  });
}

async function searchMtg(query: string): Promise<IdentifiedCard[]> {
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
    query,
  )}&unique=prints`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return [];
  const json = (await response.json()) as { data?: ScryfallCard[] };
  return (json.data ?? []).slice(0, 6).map((card) => {
    const usd = Number.parseFloat(card.prices?.usd || card.prices?.usd_foil || "");
    return {
      name: card.name,
      setName: card.set_name,
      number: card.collector_number,
      rarity: card.rarity,
      category: "mtg" as const,
      imageUrl:
        card.image_uris?.normal ||
        card.card_faces?.[0]?.image_uris?.normal ||
        card.image_uris?.small,
      catalogPrice: Number.isFinite(usd) ? usd : undefined,
      catalogLabel: Number.isFinite(usd) ? "Scryfall / TCGPlayer USD" : undefined,
      details: [card.set_name, card.rarity].filter(Boolean).join(" · "),
      query: [card.name, card.set_name].filter(Boolean).join(" "),
    };
  });
}

async function searchYgo(query: string): Promise<IdentifiedCard[]> {
  const url = `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(
    query,
  )}&num=6&offset=0`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return [];
  const json = (await response.json()) as { data?: YgoCard[] };
  return (json.data ?? []).slice(0, 6).map((card) => {
    const prices = card.card_prices?.[0];
    const ebay = Number.parseFloat(prices?.ebay_price || "");
    const tcg = Number.parseFloat(prices?.tcgplayer_price || "");
    const price = firstPrice([
      Number.isFinite(ebay) ? ebay : null,
      Number.isFinite(tcg) ? tcg : null,
    ]);
    return {
      name: card.name,
      setName: card.type,
      rarity: card.race,
      category: "yugioh" as const,
      imageUrl: card.card_images?.[0]?.image_url,
      catalogPrice: price,
      catalogLabel: Number.isFinite(ebay)
        ? "YGOPRODeck eBay avg"
        : Number.isFinite(tcg)
          ? "TCGPlayer"
          : undefined,
      details: [card.type, card.race].filter(Boolean).join(" · "),
      query: card.name,
    };
  });
}

export async function lookupCatalog(
  query: string,
  preferred?: CardCategory,
): Promise<IdentifiedCard[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const tasks: Array<Promise<IdentifiedCard[]>> = [];
  const want = (category: CardCategory) =>
    !preferred || preferred === "other" || preferred === category;

  if (want("pokemon")) tasks.push(searchPokemon(q).catch(() => []));
  if (want("mtg")) tasks.push(searchMtg(q).catch(() => []));
  if (want("yugioh")) tasks.push(searchYgo(q).catch(() => []));

  const groups = await Promise.all(tasks);
  const merged = groups.flat();
  if (preferred && preferred !== "other") {
    const focused = merged.filter((card) => card.category === preferred);
    if (focused.length) return focused;
  }
  return merged;
}

export function cardFromQuery(
  query: string,
  ocrText = "",
  category?: CardCategory,
): IdentifiedCard {
  const detected = category ?? detectCategory(`${query}\n${ocrText}`);
  return {
    name: query,
    category: detected,
    query,
    details:
      detected === "sports"
        ? "Sports / non-catalog card — value from eBay sold comps"
        : undefined,
  };
}

export function bestQuery(ocrText: string, manual?: string): string {
  if (manual?.trim()) return manual.trim();
  return suggestQuery(ocrText);
}
