"use client";

import { categoryLabel } from "@/lib/query";
import { formatMoney, formatSoldDate } from "@/lib/stats";
import type { IdentifiedCard, ScanResult } from "@/lib/types";

export function sourceLabel(source: ScanResult["estimate"]["source"]): string {
  switch (source) {
    case "ebay-sold":
      return "Median of recent eBay sold listings";
    case "ebay-active":
      return "Median of current eBay asking prices";
    default:
      return "Catalog market price";
  }
}

export function ResultsCard({
  result,
  preview,
  ebayUrl,
  onSelectHit,
  actions,
}: {
  result: ScanResult;
  preview: string | null;
  ebayUrl: string | null;
  onSelectHit: (hit: IdentifiedCard) => void;
  actions?: React.ReactNode;
}) {
  const { card, estimate, sales } = result;

  return (
    <div className="glass holo-border overflow-hidden rounded-[28px]">
      <div className="grid gap-0 sm:grid-cols-[150px_minmax(0,1fr)]">
        <div className="relative h-40 bg-black/40 sm:h-full sm:min-h-44">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.imageUrl || preview || "/window.svg"}
            alt={card.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="p-4 sm:p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#7dffe1]/80">
            {categoryLabel(card.category)}
            {card.details ? ` · ${card.details}` : ""}
          </p>
          <h2 className="mt-2 font-display text-2xl leading-tight sm:text-3xl">
            {card.name}
          </h2>
          <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-[#93a8a2]">
            Estimated value
          </p>
          <p className="holo-text font-display mt-1 text-4xl sm:text-5xl md:text-6xl">
            {formatMoney(estimate.estimated)}
          </p>
          <p className="mt-2 text-sm text-[#93a8a2]">
            {sourceLabel(estimate.source)}
          </p>
        </div>
      </div>

      {actions ? <div className="px-4 pb-1 pt-4 sm:px-5">{actions}</div> : null}

      <div className="mt-4 grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
        <Stat label="Last sold" value={formatMoney(estimate.lastSold)} />
        <Stat label="Median" value={formatMoney(estimate.median)} />
        <Stat
          label="Range"
          value={`${formatMoney(estimate.low)} – ${formatMoney(estimate.high)}`}
        />
        <Stat label="Comps" value={estimate.count ? `${estimate.count}` : "0"} />
      </div>

      {card.catalogPrice ? (
        <p className="border-b border-white/10 px-4 py-3 text-sm text-[#c9d9d4] sm:px-5">
          Catalog: {formatMoney(card.catalogPrice)}
          {card.catalogLabel ? ` · ${card.catalogLabel}` : ""}
        </p>
      ) : null}

      {result.catalogHits.length > 1 ? (
        <div className="chip-rail px-4 py-3 sm:px-5">
          {result.catalogHits.map((hit) => (
            <button
              key={`${hit.name}-${hit.setName}-${hit.number}`}
              type="button"
              onClick={() => onSelectHit(hit)}
              className={`tap shrink-0 rounded-full border px-3 py-2 text-xs ${
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

      <div className="px-4 py-4 sm:px-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#93a8a2]">
            Latest eBay {sales[0]?.source === "active" ? "asks" : "sales"}
          </p>
          {ebayUrl ? (
            <a
              href={ebayUrl}
              target="_blank"
              rel="noreferrer"
              className="tap text-xs text-[#e7c37a] underline-offset-2 hover:underline"
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
                  className="tap flex items-center gap-3 rounded-2xl border border-white/5 p-2 hover:border-white/15"
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
    <div className="bg-[#071016]/80 px-3 py-3 sm:px-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#93a8a2]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
