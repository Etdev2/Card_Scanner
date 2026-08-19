import { cardFromQuery, lookupCatalog } from "./catalog";
import { parseEbayHtml, soldSearchUrl, activeSearchUrl } from "./ebay";
import { detectCategory } from "./query";
import { estimateFromSales } from "./stats";
import type {
  CardCondition,
  IdentifiedCard,
  ScanResult,
} from "./types";
import { withCondition } from "./query";

const PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) =>
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.text();
}

async function catalogHits(
  query: string,
  category: ReturnType<typeof detectCategory>,
): Promise<IdentifiedCard[]> {
  try {
    const fromApi = await fetchJson<{ hits: IdentifiedCard[] }>(
      `/api/catalog?q=${encodeURIComponent(query)}&category=${category}`,
    );
    if (fromApi.hits?.length) return fromApi.hits;
  } catch {
    // Browser can talk to the public TCG APIs even if the server cannot.
  }
  return lookupCatalog(query, category);
}

async function ebaySales(query: string) {
  try {
    const fromApi = await fetchJson<{
      sales?: ScanResult["sales"];
      note?: string;
    }>(`/api/ebay?q=${encodeURIComponent(query)}`);
    if (fromApi.sales?.length) {
      return { sales: fromApi.sales, note: fromApi.note };
    }
  } catch {
    // Fall through to browser-side proxies.
  }

  for (const source of ["sold", "active"] as const) {
    const target =
      source === "sold" ? soldSearchUrl(query) : activeSearchUrl(query);
    for (const proxy of PROXIES) {
      try {
        const html = await fetchText(proxy(target));
        const sales = parseEbayHtml(html, source);
        if (sales.length) {
          return {
            sales,
            note:
              source === "active"
                ? "Sold history was unavailable. Showing current eBay asking prices."
                : undefined,
          };
        }
      } catch {
        continue;
      }
    }
  }

  return {
    sales: [],
    note: "Could not load eBay comps from this network. Open the sold search to check the latest sale.",
  };
}

export async function lookupCard(
  query: string,
  options: { ocrText?: string; condition?: CardCondition } = {},
): Promise<ScanResult> {
  const ocrText = options.ocrText ?? "";
  const category = detectCategory(`${query}\n${ocrText}`);
  const ebayQuery = withCondition(query, options.condition ?? "any");

  const [hits, comps] = await Promise.all([
    catalogHits(query, category),
    ebaySales(ebayQuery),
  ]);

  const card = hits[0] ?? cardFromQuery(query, ocrText, category);
  const estimate = estimateFromSales(comps.sales, card.catalogPrice ?? null);

  return {
    card: { ...card, query: ebayQuery },
    ocrText,
    sales: comps.sales,
    estimate,
    catalogHits: hits,
  };
}
