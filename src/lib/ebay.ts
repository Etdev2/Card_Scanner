import * as cheerio from "cheerio";
import type { EbaySale } from "./types";
import { parseMoney } from "./stats";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export function soldSearchUrl(query: string): string {
  const params = new URLSearchParams({
    _nkw: query,
    _sacat: "0",
    LH_Sold: "1",
    LH_Complete: "1",
    _sop: "13",
    _ipg: "60",
    rt: "nc",
  });
  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}

export function activeSearchUrl(query: string): string {
  const params = new URLSearchParams({
    _nkw: query,
    _sacat: "0",
    _sop: "12",
    _ipg: "40",
    rt: "nc",
  });
  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/");
}

export function parseEbayHtml(
  html: string,
  source: "sold" | "active",
): EbaySale[] {
  const sales: EbaySale[] = [];
  const $ = cheerio.load(html);

  $("li.s-item").each((index, element) => {
    const item = $(element);
    const title = item
      .find(".s-item__title")
      .first()
      .text()
      .replace(/^New Listing/i, "")
      .trim();
    if (!title || /^shop on ebay$/i.test(title)) return;

    const priceText = item.find(".s-item__price").first().text();
    if (/to/i.test(priceText) && priceText.includes("$")) {
      const parts = priceText
        .split(/to/i)
        .map((part) => parseMoney(part))
        .filter((value): value is number => value != null);
      if (parts.length === 2 && parts[1] / Math.max(parts[0], 0.01) > 3) {
        return;
      }
    }
    const price = parseMoney(priceText.split("to")[0] ?? "");
    if (!price || price <= 0) return;

    const href = item.find("a.s-item__link").attr("href") || "";
    const imageUrl =
      item.find("img").attr("src") || item.find("img").attr("data-src") || "";
    const soldText =
      item.find(".s-item__caption--signal, .s-item__ended-date, .s-item__title--tagblock, .POSITIVE").first().text() ||
      item.find(".s-item__dynamic").text();
    const shippingText = item.find(".s-item__shipping, .s-item__logisticsCost").text();
    const shipping = parseMoney(shippingText) ?? 0;
    const condition = item.find(".SECONDARY_INFO").first().text().trim();
    const itemId = href.match(/\/itm\/(\d+)/)?.[1] ?? `${source}-${index}`;

    sales.push({
      id: itemId,
      title,
      price,
      currency: "USD",
      url: href.split("?")[0] || href,
      imageUrl: imageUrl.startsWith("http") ? imageUrl : undefined,
      soldAt: source === "sold" ? soldText.replace(/\s+/g, " ").trim() : undefined,
      shipping,
      condition: condition || undefined,
      source,
    });
  });

  if (sales.length) {
    return dedupeSales(sales);
  }

  return dedupeSales(parseEbayHtmlLoose(html, source));
}

function parseEbayHtmlLoose(html: string, source: "sold" | "active"): EbaySale[] {
  const sales: EbaySale[] = [];
  const itemRegex =
    /href="(https:\/\/www\.ebay\.com\/itm\/[^"]+)"[^>]*>[\s\S]{0,400}?((?:New Listing)?[^<]{8,180})[\s\S]{0,800}?\$([0-9,]+\.\d{2})/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(html)) && sales.length < 40) {
    const url = decodeEntities(match[1]).split("?")[0];
    const title = decodeEntities(match[2])
      .replace(/New Listing/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    const price = parseMoney(match[3]);
    if (!title || /^shop on ebay$/i.test(title) || !price) continue;
    const id = url.match(/\/itm\/(\d+)/)?.[1] ?? `${source}-${sales.length}`;
    sales.push({
      id,
      title,
      price,
      currency: "USD",
      url,
      source,
    });
  }
  return sales;
}

function dedupeSales(sales: EbaySale[]): EbaySale[] {
  const seen = new Set<string>();
  return sales.filter((sale) => {
    const key = sale.id || `${sale.title}-${sale.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
    },
    redirect: "follow",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`eBay returned ${response.status}`);
  }
  return response.text();
}

export async function searchEbaySold(query: string): Promise<EbaySale[]> {
  const html = await fetchHtml(soldSearchUrl(query));
  if (/sign in to your account/i.test(html) && html.length < 80_000) {
    throw new Error("eBay sold listings require a session");
  }
  return parseEbayHtml(html, "sold");
}

export async function searchEbayActive(query: string): Promise<EbaySale[]> {
  const html = await fetchHtml(activeSearchUrl(query));
  return parseEbayHtml(html, "active");
}

export async function searchEbayComps(query: string): Promise<{
  sales: EbaySale[];
  note?: string;
}> {
  try {
    const sold = await searchEbaySold(query);
    if (sold.length) return { sales: sold };
  } catch {
    // Fall through to active listings — still useful as a market read.
  }

  const active = await searchEbayActive(query);
  return {
    sales: active,
    note: active.length
      ? "Sold history was blocked. Showing current eBay asking prices instead."
      : "Could not reach eBay listings from this server.",
  };
}
