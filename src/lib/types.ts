export type CardCategory =
  | "pokemon"
  | "mtg"
  | "yugioh"
  | "sports"
  | "other";

export type CardCondition =
  | "any"
  | "raw"
  | "psa-10"
  | "psa-9"
  | "bgs-9.5"
  | "cgc-10";

export type PriceSource = "ebay-sold" | "ebay-active" | "catalog";

export interface IdentifiedCard {
  name: string;
  setName?: string;
  number?: string;
  rarity?: string;
  category: CardCategory;
  imageUrl?: string;
  catalogPrice?: number;
  catalogLabel?: string;
  details?: string;
  query: string;
}

export interface EbaySale {
  id: string;
  title: string;
  price: number;
  currency: string;
  url: string;
  imageUrl?: string;
  soldAt?: string;
  shipping?: number;
  condition?: string;
  source: "sold" | "active";
}

export interface ValueEstimate {
  estimated: number | null;
  lastSold: number | null;
  median: number | null;
  average: number | null;
  low: number | null;
  high: number | null;
  count: number;
  source: PriceSource;
  currency: string;
}

export interface ScanResult {
  card: IdentifiedCard;
  ocrText: string;
  sales: EbaySale[];
  estimate: ValueEstimate;
  catalogHits: IdentifiedCard[];
}

export const CONDITIONS: { id: CardCondition; label: string; suffix: string }[] =
  [
    { id: "any", label: "Any", suffix: "" },
    { id: "raw", label: "Raw", suffix: "raw -psa -bgs -cgc -sgc" },
    { id: "psa-10", label: "PSA 10", suffix: "PSA 10" },
    { id: "psa-9", label: "PSA 9", suffix: "PSA 9 -PSA 10" },
    { id: "bgs-9.5", label: "BGS 9.5", suffix: "BGS 9.5" },
    { id: "cgc-10", label: "CGC 10", suffix: "CGC 10" },
  ];

/**
 * A saved card in the on-device collection. Local-first: every post lives in
 * IndexedDB (or localStorage as a fallback) on the collector's own device.
 * `ownerId` is the seam for real accounts later — today it is always "local".
 */
export interface CollectionPost {
  id: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  /** Compressed JPEG data URL of the card photo. */
  imageDataUrl: string | null;
  name: string;
  query: string;
  category: CardCategory;
  condition: CardCondition;
  caption?: string;
  estimatedValue: number | null;
  lastSold: number | null;
  source: PriceSource;
  likes: number;
  liked: boolean;
  ocrText?: string;
  /** Seeded sample post — dismissible, never counted as a real scan. */
  demo?: boolean;
}

export interface CollectionProfile {
  displayName: string;
  updatedAt: number;
}

export interface CollectionTotals {
  count: number;
  totalValue: number;
  pricedCount: number;
}
