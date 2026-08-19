# HoloScan

Next.js app that scans TCG and sports trading cards, reads the name with OCR, and estimates market value from the latest eBay sold listings.

## What it does

1. **Scan** a card with the camera or upload a photo.
2. **Read** the card with Tesseract OCR and suggest a search query you can edit.
3. **Identify** Pokémon, Magic, and Yu-Gi-Oh! cards against public catalogs when possible.
4. **Price** the card from recent eBay sold comps (median, last sold, range). If sold history is blocked, it falls back to current eBay asks and catalog prices.

Sports cards (Topps, Panini Prizm, Bowman, etc.) skip catalogs and go straight to eBay comps.

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
