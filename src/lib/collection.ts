"use client";

import type {
  CardCategory,
  CardCondition,
  CollectionPost,
  CollectionProfile,
  CollectionTotals,
  PriceSource,
} from "./types";

/**
 * Local-first storage for the personal card collection.
 *
 * Everything lives on the device: IndexedDB when it is available (photos are
 * big) and localStorage as a fallback. Nothing is uploaded anywhere.
 *
 * Seam for accounts later: every record carries an `ownerId`. Today it is
 * always LOCAL_OWNER. When accounts land, swap the driver below for a remote
 * one and keep the same function signatures.
 */

export const LOCAL_OWNER = "local";

const POSTS_KEY = "holoscan:posts:v1";
const PROFILE_KEY = "holoscan:profile:v1";
const DEMO_KEY = "holoscan:demo-dismissed:v1";
const SEEDED_KEY = "holoscan:seeded:v1";

type Driver = {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
};

let driverPromise: Driver | null = null;

function memoryDriver(): Driver {
  const store = new Map<string, unknown>();
  return {
    async get<T>(key: string) {
      return store.get(key) as T | undefined;
    },
    async set<T>(key: string, value: T) {
      store.set(key, value);
    },
  };
}

function localStorageDriver(): Driver {
  return {
    async get<T>(key: string) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : undefined;
      } catch {
        return undefined;
      }
    },
    async set<T>(key: string, value: T) {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
  };
}

async function indexedDbDriver(): Promise<Driver | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const idb = await import("idb-keyval");
    const store = idb.createStore("holoscan", "collection");
    // Touch the store once so a blocked/private-mode IndexedDB fails here
    // instead of on the first save.
    await idb.get(POSTS_KEY, store);
    return {
      get: <T,>(key: string) => idb.get<T>(key, store),
      set: <T,>(key: string, value: T) => idb.set(key, value, store),
    };
  } catch {
    return null;
  }
}

async function getDriver(): Promise<Driver> {
  if (driverPromise) return driverPromise;
  if (typeof window === "undefined") {
    driverPromise = memoryDriver();
    return driverPromise;
  }
  const idb = await indexedDbDriver();
  driverPromise = idb ?? localStorageDriver();
  return driverPromise;
}

/* ------------------------------------------------------------------ */
/* In-memory cache + subscriptions (so every tab of the UI stays live) */
/* ------------------------------------------------------------------ */

let cache: CollectionPost[] = [];
let profileCache: CollectionProfile = {
  displayName: "My collection",
  updatedAt: 0,
};
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function snapshotPosts(): CollectionPost[] {
  return cache;
}

export function snapshotProfile(): CollectionProfile {
  return profileCache;
}

export function isHydrated(): boolean {
  return hydrated;
}

function sortPosts(posts: CollectionPost[]): CollectionPost[] {
  return [...posts].sort((a, b) => b.createdAt - a.createdAt);
}

function normalize(post: Partial<CollectionPost>): CollectionPost {
  const now = Date.now();
  return {
    id: post.id ?? createId(),
    ownerId: post.ownerId ?? LOCAL_OWNER,
    createdAt: post.createdAt ?? now,
    updatedAt: post.updatedAt ?? now,
    imageDataUrl: post.imageDataUrl ?? null,
    name: post.name?.trim() || "Untitled card",
    query: post.query ?? post.name ?? "",
    category: (post.category ?? "other") as CardCategory,
    condition: (post.condition ?? "any") as CardCondition,
    caption: post.caption?.trim() || undefined,
    estimatedValue: post.estimatedValue ?? null,
    lastSold: post.lastSold ?? null,
    source: (post.source ?? "catalog") as PriceSource,
    likes: Math.max(0, Math.round(post.likes ?? 0)),
    liked: Boolean(post.liked),
    ocrText: post.ocrText,
    demo: post.demo,
  };
}

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `post_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function persist(): Promise<void> {
  const driver = await getDriver();
  try {
    await driver.set(POSTS_KEY, cache);
  } catch {
    // Most likely a localStorage quota error. Drop the oldest photos so the
    // metadata still survives instead of losing the whole collection.
    const lighter = cache.map((post, index) =>
      index > 5 ? { ...post, imageDataUrl: null } : post,
    );
    try {
      await driver.set(POSTS_KEY, lighter);
      cache = lighter;
      emit();
    } catch {
      throw new Error(
        "This device is out of local storage space for new card photos.",
      );
    }
  }
}

/** Load the collection from the device. Safe to call repeatedly. */
export async function hydrate(): Promise<void> {
  if (hydrated) return;
  if (hydrating) return hydrating;
  hydrating = (async () => {
    const driver = await getDriver();
    const [posts, profile] = await Promise.all([
      driver.get<CollectionPost[]>(POSTS_KEY),
      driver.get<CollectionProfile>(PROFILE_KEY),
    ]);
    cache = sortPosts((posts ?? []).map(normalize));
    if (profile?.displayName) profileCache = profile;
    hydrated = true;
    emit();
  })();
  try {
    await hydrating;
  } finally {
    hydrating = null;
  }
}

export async function listPosts(): Promise<CollectionPost[]> {
  await hydrate();
  return cache;
}

export async function getPost(id: string): Promise<CollectionPost | null> {
  await hydrate();
  return cache.find((post) => post.id === id) ?? null;
}

export async function addPost(
  input: Omit<Partial<CollectionPost>, "id" | "createdAt">,
): Promise<CollectionPost> {
  await hydrate();
  const post = normalize({ ...input, id: createId(), createdAt: Date.now() });
  cache = sortPosts([post, ...cache]);
  emit();
  await persist();
  return post;
}

export async function updatePost(
  id: string,
  patch: Partial<CollectionPost>,
): Promise<CollectionPost | null> {
  await hydrate();
  let updated: CollectionPost | null = null;
  cache = cache.map((post) => {
    if (post.id !== id) return post;
    updated = normalize({ ...post, ...patch, updatedAt: Date.now() });
    return updated;
  });
  emit();
  await persist();
  return updated;
}

export async function deletePost(id: string): Promise<void> {
  await hydrate();
  cache = cache.filter((post) => post.id !== id);
  emit();
  await persist();
}

export async function toggleLike(id: string): Promise<CollectionPost | null> {
  await hydrate();
  const current = cache.find((post) => post.id === id);
  if (!current) return null;
  return updatePost(id, {
    liked: !current.liked,
    likes: Math.max(0, current.likes + (current.liked ? -1 : 1)),
  });
}

export function computeTotals(posts: CollectionPost[]): CollectionTotals {
  const priced = posts.filter((post) => typeof post.estimatedValue === "number");
  return {
    count: posts.length,
    pricedCount: priced.length,
    totalValue: priced.reduce((sum, post) => sum + (post.estimatedValue ?? 0), 0),
  };
}

export async function collectionTotals(): Promise<CollectionTotals> {
  return computeTotals(await listPosts());
}

/* ------------------------------- profile -------------------------------- */

export async function getProfile(): Promise<CollectionProfile> {
  await hydrate();
  return profileCache;
}

export async function setDisplayName(name: string): Promise<CollectionProfile> {
  await hydrate();
  profileCache = {
    displayName: name.trim() || "My collection",
    updatedAt: Date.now(),
  };
  emit();
  const driver = await getDriver();
  await driver.set(PROFILE_KEY, profileCache);
  return profileCache;
}

/* --------------------------------- demo --------------------------------- */

function demoArt(from: string, to: string, glyph: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="55%" stop-color="#071016"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="480" height="480" fill="#071016"/>
  <rect width="480" height="480" fill="url(#g)" opacity="0.85"/>
  <rect x="96" y="52" width="288" height="376" rx="20" fill="rgba(7,16,22,0.55)" stroke="rgba(237,246,243,0.35)" stroke-width="2"/>
  <text x="240" y="270" text-anchor="middle" font-size="140" font-family="Helvetica, sans-serif" fill="rgba(237,246,243,0.9)">${glyph}</text>
  <text x="240" y="356" text-anchor="middle" font-size="26" letter-spacing="6" font-family="Helvetica, sans-serif" fill="rgba(237,246,243,0.55)">DEMO</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const DEMO_POSTS: Array<Partial<CollectionPost>> = [
  {
    name: "Charizard Base Set Holo",
    query: "Charizard Base Set Holo 4/102",
    category: "pokemon",
    condition: "raw",
    caption: "Sample post — scan a real card to replace it.",
    estimatedValue: 412,
    lastSold: 399,
    source: "ebay-sold",
    likes: 3,
    imageDataUrl: demoArt("#e7c37a", "#c7a0ff", "🔥"),
    demo: true,
  },
  {
    name: "Victor Wembanyama Prizm RC",
    query: "2023 Panini Prizm Victor Wembanyama RC",
    category: "sports",
    condition: "any",
    caption: "Demo card. Tap Remove demo cards when you are ready.",
    estimatedValue: 96,
    lastSold: 88,
    source: "ebay-sold",
    likes: 1,
    imageDataUrl: demoArt("#7dffe1", "#5884ff", "🏀"),
    demo: true,
  },
  {
    name: "Blue-Eyes White Dragon LOB",
    query: "Blue-Eyes White Dragon LOB",
    category: "yugioh",
    condition: "any",
    caption: "Demo card.",
    estimatedValue: 54,
    lastSold: 61,
    source: "ebay-sold",
    likes: 0,
    imageDataUrl: demoArt("#5884ff", "#7dffe1", "🐉"),
    demo: true,
  },
];

export async function hasDismissedDemo(): Promise<boolean> {
  const driver = await getDriver();
  return Boolean(await driver.get<boolean>(DEMO_KEY));
}

/** Seed up to 3 sample posts, only when the collection is completely empty. */
export async function seedDemoPosts(): Promise<boolean> {
  await hydrate();
  if (cache.length > 0) return false;
  if (await hasDismissedDemo()) return false;
  const driver = await getDriver();
  // Only ever seed on the very first visit, so an emptied collection stays
  // empty.
  if (await driver.get<boolean>(SEEDED_KEY)) return false;
  await driver.set(SEEDED_KEY, true);
  const now = Date.now();
  cache = sortPosts(
    DEMO_POSTS.map((post, index) =>
      normalize({
        ...post,
        id: createId(),
        createdAt: now - index * 60_000,
      }),
    ),
  );
  emit();
  await persist();
  return true;
}

export async function dismissDemoPosts(): Promise<void> {
  await hydrate();
  cache = cache.filter((post) => !post.demo);
  emit();
  const driver = await getDriver();
  await driver.set(DEMO_KEY, true);
  await persist();
}

export function hasDemoPosts(posts: CollectionPost[]): boolean {
  return posts.some((post) => post.demo);
}

/* ------------------------------ image utils ------------------------------ */

/** Shrink a captured photo so a phone can hold hundreds of cards locally. */
export async function compressImage(
  dataUrl: string,
  maxSize = 900,
  quality = 0.72,
): Promise<string> {
  if (typeof document === "undefined") return dataUrl;
  if (dataUrl.startsWith("data:image/svg")) return dataUrl;
  try {
    const image = await loadImage(dataUrl);
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image."));
    image.src = src;
  });
}
