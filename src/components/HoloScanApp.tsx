"use client";

import { useMemo, useState } from "react";
import { lookupCard } from "@/lib/lookup";
import { categoryLabel } from "@/lib/query";
import { formatMoney, formatSoldDate } from "@/lib/stats";
import {
  CONDITIONS,
  type CardCondition,
  type IdentifiedCard,
  type ScanResult,
} from "@/lib/types";
import { soldSearchUrl } from "@/lib/ebay";
import { Scanner } from "./Scanner";

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

  const ebayUrl = useMemo(
    () => (result ? soldSearchUrl(result.card.query) : null),
    [result],
  );

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
      setHistory((current) =>
        [next, ...current.filter((item) => item.card.query !== next.card.query)].slice(
          0,
          8,
        ),
      );
      setStatus("idle");
      setMessage("");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Lookup failed. Try another query.",
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-6 md:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.28em] text-[#7dffe1]/80">
            TCG + sports comps
          </p>
          <h1 className="font-display text-5xl tracking-tight md:text-6xl">
            <span className="holo-text">HoloScan</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#93a8a2] md:text-base">
            Scan a Pokémon, Magic, Yu-Gi-Oh!, or sports card. We read the name,
            then estimate value from the latest eBay sold listings.
          </p>
        </div>
        <div className="glass holo-border rounded-2xl px-4 py-3 text-right">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#93a8a2]">
            Estimate source
          </p>
          <p className="mt-1 text-sm text-[#edf6f3]">
            eBay sold · median of recent comps
          </p>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
        <section className="space-y-4">
          <Scanner
            busy={status === "working"}
            onRecognized={onRecognized}
            onStatus={setMessage}
          />

          <form
            className="glass holo-border rounded-3xl p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void runLookup(query);
            }}
          >
            <label className="text-[11px] uppercase tracking-[0.22em] text-[#93a8a2]">
              Card search
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Charizard Base Set, 2023 Prizm Wembanyama RC…"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none ring-[#7dffe1]/40 placeholder:text-[#93a8a2]/70 focus:ring-2"
              />
              <button
                type="submit"
                disabled={status === "working"}
                className="rounded-2xl bg-[#edf6f3] px-5 py-3 text-sm font-semibold text-[#071016] transition hover:bg-white disabled:opacity-60"
              >
                Get value
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {CONDITIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCondition(item.id)}
                  className={`rounded-full px-3 py-1.5 text-xs ${
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

          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setPreview(null);
                  void runLookup(example);
                }}
                className="rounded-full border border-white/10 px-3 py-1.5 text-left text-xs text-[#c9d9d4] hover:border-[#7dffe1]/40 hover:text-white"
              >
                {example}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          {message ? (
            <p className="text-sm text-[#7dffe1]">{message}</p>
          ) : null}

          {result ? (
            <ResultsCard
              result={result}
              preview={preview}
              ebayUrl={ebayUrl}
              onSelectHit={selectHit}
            />
          ) : (
            <EmptyState />
          )}

          <footer className="px-1 pb-2 text-xs leading-5 text-[#93a8a2]/80">
            Estimates are unofficial comps, not an appraisal. eBay sold data
            depends on public listing pages and can miss Best Offers or lots.
          </footer>

          {history.length > 1 ? (
            <div className="glass rounded-3xl p-4">
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
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/5 px-3 py-2 text-left hover:border-white/15"
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
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass holo-border rounded-[28px] px-6 py-14 text-center">
      <p className="text-xs uppercase tracking-[0.28em] text-[#7dffe1]/80">
        Waiting for a card
      </p>
      <h2 className="font-display mt-3 text-3xl">Point, snap, price.</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#93a8a2]">
        Use the camera or upload a photo. HoloScan OCRs the card, matches TCG
        catalogs when it can, then reads the newest eBay sold comps for an
        estimated market value.
      </p>
    </div>
  );
}

function ResultsCard({
  result,
  preview,
  ebayUrl,
  onSelectHit,
}: {
  result: ScanResult;
  preview: string | null;
  ebayUrl: string | null;
  onSelectHit: (hit: IdentifiedCard) => void;
}) {
  const { card, estimate, sales } = result;
  const sourceLabel =
    estimate.source === "ebay-sold"
      ? "Median of recent eBay sold listings"
      : estimate.source === "ebay-active"
        ? "Median of current eBay asking prices"
        : "Catalog market price";

  return (
    <div className="glass holo-border overflow-hidden rounded-[28px]">
      <div className="grid gap-0 md:grid-cols-[160px_minmax(0,1fr)]">
        <div className="relative min-h-44 bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.imageUrl || preview || "/window.svg"}
            alt={card.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#7dffe1]/80">
            {categoryLabel(card.category)}
            {card.details ? ` · ${card.details}` : ""}
          </p>
          <h2 className="mt-2 font-display text-3xl leading-none">{card.name}</h2>
          <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[#93a8a2]">
            Estimated value
          </p>
          <p className="holo-text font-display mt-1 text-5xl md:text-6xl">
            {formatMoney(estimate.estimated)}
          </p>
          <p className="mt-2 text-sm text-[#93a8a2]">{sourceLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
        <Stat label="Last sold" value={formatMoney(estimate.lastSold)} />
        <Stat label="Median" value={formatMoney(estimate.median)} />
        <Stat label="Range" value={`${formatMoney(estimate.low)} – ${formatMoney(estimate.high)}`} />
        <Stat
          label="Comps"
          value={estimate.count ? `${estimate.count}` : "0"}
        />
      </div>

      {card.catalogPrice ? (
        <p className="border-b border-white/10 px-5 py-3 text-sm text-[#c9d9d4]">
          Catalog: {formatMoney(card.catalogPrice)}
          {card.catalogLabel ? ` · ${card.catalogLabel}` : ""}
        </p>
      ) : null}

      {result.catalogHits.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto px-5 py-3">
          {result.catalogHits.map((hit) => (
            <button
              key={`${hit.name}-${hit.setName}-${hit.number}`}
              type="button"
              onClick={() => onSelectHit(hit)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
                hit.query === card.query
                  ? "border-[#7dffe1] text-[#7dffe1]"
                  : "border-white/10 text-[#93a8a2]"
              }`}
            >
              {hit.setName || hit.name}
              {hit.catalogPrice ? ` · ${formatMoney(hit.catalogPrice)}` : ""}
            </button>
          ))}
        </div>
      ) : null}

      <div className="px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#93a8a2]">
            Latest eBay {sales[0]?.source === "active" ? "asks" : "sales"}
          </p>
          {ebayUrl ? (
            <a
              href={ebayUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#e7c37a] underline-offset-2 hover:underline"
            >
              Open sold search
            </a>
          ) : null}
        </div>

        {sales.length ? (
          <ul className="space-y-2">
            {sales.slice(0, 8).map((sale) => (
              <li key={`${sale.id}-${sale.url}`}>
                <a
                  href={sale.url || ebayUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-white/5 p-2 hover:border-white/15"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-black/40">
                    {sale.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sale.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{sale.title}</p>
                    <p className="text-xs text-[#93a8a2]">
                      {sale.source === "sold"
                        ? formatSoldDate(sale.soldAt)
                        : "Active listing"}
                      {sale.condition ? ` · ${sale.condition}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#e7c37a]">
                    {formatMoney(sale.price)}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#93a8a2]">
            No parsed comps yet. Use Open sold search to view the latest eBay
            sale in a new tab.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#071016]/80 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#93a8a2]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
