"use client";

import { useEffect, useMemo, useState } from "react";
import { lookupCard } from "@/lib/lookup";
import { formatMoney } from "@/lib/stats";
import {
  CONDITIONS,
  type CardCondition,
  type IdentifiedCard,
  type ScanResult,
} from "@/lib/types";
import { soldSearchUrl } from "@/lib/ebay";
import { Scanner } from "./Scanner";
import { ResultsCard } from "./ResultsCard";
import { AddToCollection } from "./AddToCollection";

const EXAMPLES = [
  "Charizard Base Set Holo 4/102",
  "Pikachu VMAX Rainbow Rare",
  "Black Lotus Alpha",
  "Blue-Eyes White Dragon LOB",
  "2023 Panini Prizm Victor Wembanyama RC",
  "2018 Topps Chrome Shohei Ohtani RC",
  "1986 Fleer Michael Jordan RC",
];

export function HoloScanApp() {
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState<CardCondition>("any");
  const [ocrText, setOcrText] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const ebayUrl = useMemo(
    () => (result ? soldSearchUrl(result.card.query) : null),
    [result],
  );

  // Keep the phone sheet from trapping the page behind it.
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  async function runLookup(nextQuery: string, nextOcr = ocrText) {
    const trimmed = nextQuery.trim();
    if (trimmed.length < 2) return;
    setQuery(trimmed);
    setStatus("working");
    setMessage("Pulling catalog IDs and latest eBay comps…");
    try {
      const next = await lookupCard(trimmed, {
        ocrText: nextOcr,
        condition,
      });
      setResult(next);
      setSheetOpen(true);
      setHistory((current) =>
        [
          next,
          ...current.filter((item) => item.card.query !== next.card.query),
        ].slice(0, 8),
      );
      setStatus("idle");
      setMessage("");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Lookup failed. Try another query.",
      );
    }
  }

  function onRecognized(text: string, suggested: string, imageUrl: string) {
    setOcrText(text);
    setPreview(imageUrl);
    setQuery(suggested);
    void runLookup(suggested, text);
  }

  function selectHit(hit: IdentifiedCard) {
    setQuery(hit.query);
    void runLookup(hit.query);
  }

  const results = result ? (
    <ResultsCard
      result={result}
      preview={preview}
      ebayUrl={ebayUrl}
      onSelectHit={selectHit}
      actions={
        <AddToCollection
          key={`${result.card.query}:${result.estimate.estimated ?? "na"}`}
          result={result}
          preview={preview}
          condition={condition}
        />
      }
    />
  ) : (
    <EmptyState />
  );

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-5 md:px-8 md:py-8">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)]">
        <section className="space-y-3 sm:space-y-4">
          <div className="hidden md:block">
            <p className="text-xs uppercase tracking-[0.28em] text-[#7dffe1]/80">
              TCG + sports comps
            </p>
            <h1 className="font-display mt-1 text-4xl tracking-tight lg:text-5xl">
              Point, snap, <span className="holo-text">price</span>.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#93a8a2]">
              Scan a Pokémon, Magic, Yu-Gi-Oh!, or sports card. HoloScan reads
              the name, then estimates value from the latest eBay sold listings
              — and saves it to your collection.
            </p>
          </div>

          <Scanner
            busy={status === "working"}
            onRecognized={onRecognized}
            onStatus={setMessage}
          />

          <form
            className="glass holo-border rounded-3xl p-3 sm:p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void runLookup(query);
            }}
          >
            <label
              htmlFor="holoscan-query"
              className="text-[11px] uppercase tracking-[0.22em] text-[#93a8a2]"
            >
              Card search
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-3">
              <input
                id="holoscan-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Charizard Base Set, Prizm Wembanyama RC…"
                enterKeyHint="search"
                className="min-h-11 min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-base outline-none ring-[#7dffe1]/40 placeholder:text-[#93a8a2]/70 focus:ring-2"
              />
              <button
                type="submit"
                disabled={status === "working"}
                className="tap tap-target flex items-center justify-center rounded-2xl bg-[#edf6f3] px-5 text-sm font-semibold text-[#071016] transition hover:bg-white disabled:opacity-60"
              >
                {status === "working" ? "Pricing…" : "Get value"}
              </button>
            </div>

            <div className="chip-rail mt-3">
              {CONDITIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCondition(item.id)}
                  className={`tap rounded-full px-3 py-2 text-xs ${
                    condition === item.id
                      ? "bg-[#7dffe1] text-[#071016]"
                      : "border border-white/10 text-[#93a8a2] hover:border-white/25"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </form>

          <div className="chip-rail">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setPreview(null);
                  void runLookup(example);
                }}
                className="tap rounded-full border border-white/10 px-3 py-2 text-left text-xs text-[#c9d9d4] hover:border-[#7dffe1]/40 hover:text-white"
              >
                {example}
              </button>
            ))}
          </div>

          {message ? (
            <p
              role="status"
              className={`text-sm ${
                status === "error" ? "text-[#e7c37a]" : "text-[#7dffe1]"
              }`}
            >
              {message}
            </p>
          ) : null}

          {history.length > 1 ? (
            <div className="glass rounded-3xl p-3 sm:p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#93a8a2]">
                Recent scans
              </p>
              <div className="mt-3 space-y-2">
                {history.slice(1).map((item) => (
                  <button
                    key={item.card.query}
                    type="button"
                    onClick={() => {
                      setResult(item);
                      setQuery(item.card.query);
                      setSheetOpen(true);
                    }}
                    className="tap tap-target flex w-full items-center justify-between gap-3 rounded-2xl border border-white/5 px-3 py-2 text-left hover:border-white/15"
                  >
                    <span className="truncate text-sm">{item.card.name}</span>
                    <span className="text-sm text-[#e7c37a]">
                      {formatMoney(item.estimate.estimated)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {/* Phone: results arrive as a compact sheet. Tablet/desktop: a column. */}
        <section
          className={`${
            sheetOpen && result
              ? "fixed inset-x-0 bottom-0 z-40 max-h-[82dvh] overflow-y-auto overscroll-contain rounded-t-[28px] border-t border-white/10 bg-[#071016]/95 px-3 pb-[calc(96px+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sheet-in"
              : "hidden"
          } lg:static lg:z-auto lg:block lg:max-h-none lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-0 lg:backdrop-blur-none`}
        >
          {sheetOpen && result ? (
            <div className="sticky top-0 z-10 -mx-3 mb-2 flex items-center justify-between gap-3 bg-[#071016]/95 px-3 py-2 lg:hidden">
              <span className="mx-auto h-1.5 w-10 rounded-full bg-white/25" />
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="tap tap-target absolute right-3 flex items-center rounded-full border border-white/15 px-3 text-xs text-[#c9d9d4]"
              >
                Close
              </button>
            </div>
          ) : null}

          <div className="space-y-4">
            {results}

            <footer className="px-1 pb-2 text-xs leading-5 text-[#93a8a2]/80">
              Estimates are unofficial comps, not an appraisal. eBay sold data
              depends on public listing pages and can miss Best Offers or lots.
            </footer>
          </div>
        </section>
      </div>

      {/* Phone: re-open the last result without re-scanning. */}
      {result && !sheetOpen ? (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="tap fixed inset-x-4 bottom-[calc(96px+env(safe-area-inset-bottom))] z-30 flex items-center justify-between gap-3 rounded-2xl border border-[#7dffe1]/30 bg-[#0b1a22]/95 px-4 py-3 text-left backdrop-blur-xl lg:hidden"
        >
          <span className="min-w-0 flex-1 truncate text-sm">
            {result.card.name}
          </span>
          <span className="text-sm font-semibold text-[#e7c37a]">
            {formatMoney(result.estimate.estimated)}
          </span>
        </button>
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass holo-border rounded-[28px] px-6 py-10 text-center md:py-14">
      <p className="text-xs uppercase tracking-[0.28em] text-[#7dffe1]/80">
        Waiting for a card
      </p>
      <h2 className="font-display mt-3 text-2xl md:text-3xl">
        Point, snap, price.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#93a8a2]">
        Use the camera or pick a photo from your camera roll. HoloScan OCRs the
        card, matches TCG catalogs when it can, reads the newest eBay sold
        comps, then lets you save it to your collection.
      </p>
    </div>
  );
}
