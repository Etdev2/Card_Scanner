import type { EbaySale, PriceSource, ValueEstimate } from "./types";

export function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Drop extreme outliers so a $2,000 lot doesn't wreck a $20 card. */
export function trimOutliers(values: number[]): number[] {
  if (values.length < 6) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const cut = Math.max(1, Math.floor(sorted.length * 0.1));
  return sorted.slice(cut, sorted.length - cut);
}

export function estimateFromSales(
  sales: EbaySale[],
  fallbackCatalog?: number | null,
): ValueEstimate {
  const sold = sales.filter((sale) => sale.source === "sold" && sale.price > 0);
  const active = sales.filter(
    (sale) => sale.source === "active" && sale.price > 0,
  );
  const pool = sold.length ? sold : active;
  const prices = trimOutliers(pool.map((sale) => sale.price));
  const source: PriceSource = sold.length
    ? "ebay-sold"
    : pool.length
      ? "ebay-active"
      : "catalog";

  const med = median(prices);
  const avg = average(prices);
  const lastSold = sold[0]?.price ?? null;

  let estimated: number | null = med ?? avg ?? lastSold ?? null;
  if (estimated == null && fallbackCatalog) {
    estimated = fallbackCatalog;
  }

  return {
    estimated,
    lastSold,
    median: med,
    average: avg,
    low: prices.length ? Math.min(...prices) : null,
    high: prices.length ? Math.max(...prices) : null,
    count: pool.length,
    source: estimated != null && !pool.length ? "catalog" : source,
    currency: "USD",
  };
}

export function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

export function formatSoldDate(raw?: string): string {
  if (!raw) return "Recent";
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    return raw.replace(/^Sold\s+/i, "") || "Recent";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(parsed));
}
