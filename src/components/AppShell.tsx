"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCollection } from "@/lib/useCollection";
import { formatMoney } from "@/lib/stats";

interface Tab {
  href: string;
  label: string;
  icon: ReactNode;
  match: (pathname: string) => boolean;
}

function ScanIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" fill="none">
      <path
        d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <rect
        x="8.5"
        y="8.5"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function FeedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" fill="none">
      <path
        d="M3 10.5 12 4l9 6.5V19a1 1 0 0 1-1 1h-5v-5H9v5H4a1 1 0 0 1-1-1z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" fill="none">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

const TABS: Tab[] = [
  {
    href: "/",
    label: "Scan",
    icon: <ScanIcon />,
    match: (pathname) => pathname === "/",
  },
  {
    href: "/feed",
    label: "Feed",
    icon: <FeedIcon />,
    match: (pathname) => pathname.startsWith("/feed"),
  },
  {
    href: "/collection",
    label: "Collection",
    icon: <GridIcon />,
    match: (pathname) => pathname.startsWith("/collection"),
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const { totals, ready } = useCollection();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="safe-top safe-x sticky top-0 z-40 border-b border-white/10 bg-[#071016]/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5 md:px-6">
          <Link href="/" className="tap flex min-h-11 items-center gap-2">
            <span className="font-display holo-text text-2xl leading-none tracking-tight md:text-3xl">
              HoloScan
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {TABS.map((tab) => {
              const active = tab.match(pathname);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`tap tap-target flex items-center gap-2 rounded-full px-4 text-sm transition ${
                    active
                      ? "bg-[#7dffe1]/15 text-[#7dffe1]"
                      : "text-[#93a8a2] hover:text-[#edf6f3]"
                  }`}
                >
                  <span className="[&>svg]:h-5 [&>svg]:w-5">{tab.icon}</span>
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/collection"
            className="tap tap-target flex flex-col items-end justify-center rounded-2xl border border-white/10 px-3 py-1 text-right"
          >
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#93a8a2]">
              {ready ? `${totals.count} cards` : "Collection"}
            </span>
            <span className="text-sm font-semibold text-[#e7c37a]">
              {ready ? formatMoney(totals.totalValue) : "—"}
            </span>
          </Link>
        </div>
      </header>

      <main className="safe-x pb-tabbar flex flex-1 flex-col">{children}</main>

      <nav
        aria-label="Primary"
        className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#071016]/92 backdrop-blur-xl lg:hidden"
      >
        <ul className="mx-auto flex w-full max-w-lg items-stretch justify-around px-2 pt-1.5">
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`tap tap-target flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] ${
                    active ? "text-[#7dffe1]" : "text-[#93a8a2]"
                  }`}
                >
                  {tab.icon}
                  <span className="tracking-wide">{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
