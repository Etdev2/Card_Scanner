# HoloScan

Next.js app that scans TCG and sports trading cards, reads the name with OCR, estimates market value from the latest eBay sold listings, and keeps a personal, Instagram-style collection **on your device**.

## What it does

1. **Scan** a card with the camera or upload a photo.
2. **Read** the card with Tesseract OCR and suggest a search query you can edit.
3. **Identify** Pokémon, Magic, and Yu-Gi-Oh! cards against public catalogs when possible.
4. **Price** the card from recent eBay sold comps (median, last sold, range). If sold history is blocked, it falls back to current eBay asks and catalog prices.

5. **Collect** the card as a post — photo, name, value, caption — in a 3-column grid and a vertical feed.

Sports cards (Topps, Panini Prizm, Bowman, etc.) skip catalogs and go straight to eBay comps.

## Tabs

| Route              | Tab        | What it is                                                        |
| ------------------ | ---------- | ----------------------------------------------------------------- |
| `/`                | Scan       | Camera / camera roll, search, condition chips, live estimate       |
| `/feed`            | Feed       | Reverse-chronological posts, like button, captions, timestamps     |
| `/collection`      | Collection | Profile header (name, card count, total value) + 3-column grid     |
| `/collection/[id]` | —          | Post detail: big photo, value, caption, like, re-price, delete     |

Tabs are real routes, so any tab can be bookmarked or shared as a link (the *contents* stay local to the device — see below).

## On a phone or tablet

- Bottom tab bar (Scan / Feed / Collection) on phones and small tablets; it becomes a slim top nav on large screens.
- `viewport-fit=cover` plus `env(safe-area-inset-*)` padding, so notches and the home indicator never clip the UI.
- All tap targets are at least 44px and every input is at least 16px, so iOS does not zoom on focus.
- Full-bleed rear camera (`facingMode: environment`, `playsInline`) that fills most of the Scan tab.
- **Take photo** uses `capture="environment"` (opens the camera app) and **Camera roll** is a plain file input, so you can pick an existing photo.
- After a scan the result arrives as a compact bottom sheet you can dismiss and re-open, instead of a long desktop page.
- Tablet and desktop switch to two columns: scanner | results, and grid | post detail.
- Chip rails scroll horizontally instead of stacking, and animations respect `prefers-reduced-motion`.

Camera access needs a secure context: `https://` or `http://localhost`. On a phone in your LAN, put the dev server behind HTTPS (or use a tunnel) or the browser will block `getUserMedia`.

## Your collection is device-local

There are no accounts, no server database, and no cloud sync in this app. Everything you save lives in your own browser:

- Posts are stored in **IndexedDB** (`holoscan` database, `collection` store) via `idb-keyval`, with a **localStorage** fallback when IndexedDB is unavailable (private mode, older browsers).
- Photos are downscaled to ~900px JPEG before being saved so a phone can hold hundreds of cards.
- Keys: `holoscan:posts:v1`, `holoscan:profile:v1`, `holoscan:demo-dismissed:v1`, `holoscan:seeded:v1`.
- Clearing site data, using a different browser, or switching devices means an empty collection. Nothing is uploaded, and nothing is shared with other people.
- On a brand-new install the collection is seeded with up to 3 clearly-labelled **demo cards**. Tap *Remove demo cards* once and they never come back.

The storage API lives in `src/lib/collection.ts`:

```ts
listPosts();            // newest first
addPost(partialPost);   // returns the saved post
updatePost(id, patch);
deletePost(id);
toggleLike(id);
collectionTotals();     // { count, pricedCount, totalValue }
getProfile() / setDisplayName(name);
```

`useCollection()` / `usePost(id)` in `src/lib/useCollection.ts` subscribe React to that store, so the grid, feed, and header count update the moment anything changes.

**Seam for accounts:** every post carries an `ownerId` (always `"local"` today). Adding real accounts later means swapping the driver inside `collection.ts` for a remote one and keeping the same function signatures — no UI rewrite.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How pricing works

- eBay sold search is requested first (`LH_Sold=1&LH_Complete=1`, newest first).
- Estimated value is the **median** of recent sold prices after trimming outliers.
- **Last sold** is the newest completed sale we parsed.
- Catalog prices (TCGPlayer / Scryfall / YGOPRODeck) are shown as a second opinion.

eBay no longer offers a public sold-listings API. HoloScan reads the public sold-search results page from a server route, then from browser CORS proxies if the server cannot reach eBay.

## Optional environment

Create `.env.local` if you later wire official marketplace APIs:

```
# Reserved for a future eBay Browse / partner integration
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
```

## Stack

- Next.js 16 App Router + TypeScript
- Tailwind CSS 4
- Tesseract.js (in-browser OCR)
- Pokémon TCG API, Scryfall, YGOPRODeck
- Cheerio eBay sold-listing parser
- idb-keyval for the on-device collection (IndexedDB, localStorage fallback)
