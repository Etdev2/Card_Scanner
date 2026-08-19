import { NextResponse } from "next/server";
import { searchEbayComps } from "@/lib/ebay";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();
  if (query.length < 2) {
    return NextResponse.json({ error: "Query is too short." }, { status: 400 });
  }

  try {
    const result = await searchEbayComps(query);
    return NextResponse.json({
      query,
      sales: result.sales,
      note: result.note,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to search eBay.";
    return NextResponse.json(
      { error: message, query, sales: [] },
      { status: 502 },
    );
  }
}
