import { NextResponse } from "next/server";
import { lookupCatalog } from "@/lib/catalog";
import type { CardCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

const CATEGORIES: CardCategory[] = [
  "pokemon",
  "mtg",
  "yugioh",
  "sports",
  "other",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();
  const categoryParam = searchParams.get("category") as CardCategory | null;
  const category =
    categoryParam && CATEGORIES.includes(categoryParam)
      ? categoryParam
      : undefined;

  if (query.length < 2) {
    return NextResponse.json({ hits: [] });
  }

  const hits = await lookupCatalog(query, category);
  return NextResponse.json({ hits });
}
