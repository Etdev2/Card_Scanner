"use client";

import Link from "next/link";
import { useEffect } from "react";
import { seedDemoPosts } from "@/lib/collection";
import { formatMoney } from "@/lib/stats";
import { formatRelativeTime } from "@/lib/time";
import { useCollection } from "@/lib/useCollection";
import type { CollectionPost } from "@/lib/types";
import { categoryLabel } from "@/lib/query";
import {
  CardPhoto,
  CollectionEmptyState,
  DemoBanner,
  LikeButton,
  LoadingState,
} from "./CollectionUI";

export function FeedScreen() {
  const { posts, profile, totals, ready } = useCollection();

  useEffect(() => {
    void seedDemoPosts();
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-5 md:px-8 md:py-8">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-8">
        <div className="mx-auto w-full max-w-xl space-y-4">
          <header className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#7dffe1]/80">
                Your feed
              </p>
              <h1 className="font-display text-3xl">{profile.displayName}</h1>
            </div>
            <p className="text-right text-sm text-[#93a8a2] lg:hidden">
              {ready ? `${totals.count} cards` : "…"}
              <br />
              <span className="text-[#e7c37a]">
                {ready ? formatMoney(totals.totalValue) : ""}
              </span>
            </p>
          </header>

          <DemoBanner posts={posts} />

          {!ready ? (
            <LoadingState label="Opening your on-device collection…" />
          ) : posts.length === 0 ? (
            <CollectionEmptyState
              title="Your feed is empty"
              body="Scan or upload your first card, get an eBay-based estimate, then add it to your collection. Posts stay on this device."
            />
          ) : (
            <ul className="space-y-5">
              {posts.map((post) => (
                <li key={post.id}>
                  <FeedPost post={post} owner={profile.displayName} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="mt-6 hidden lg:mt-0 lg:block">
          <div className="glass holo-border sticky top-24 rounded-3xl p-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#93a8a2]">
              Collection value
            </p>
            <p className="holo-text font-display mt-1 text-4xl">
              {ready ? formatMoney(totals.totalValue) : "—"}
            </p>
            <p className="mt-2 text-sm text-[#93a8a2]">
              {totals.count} card{totals.count === 1 ? "" : "s"} saved on this
              device
            </p>
            <Link
              href="/"
              className="tap tap-target mt-4 flex items-center justify-center rounded-2xl bg-[#7dffe1] px-4 text-sm font-semibold text-[#071016]"
            >
              Scan a card
            </Link>
            <Link
              href="/collection"
              className="tap tap-target mt-2 flex items-center justify-center rounded-2xl border border-white/15 px-4 text-sm"
            >
              Open grid
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FeedPost({ post, owner }: { post: CollectionPost; owner: string }) {
  // Posts only exist on the client, so a live timestamp cannot desync SSR.
  const stamp = formatRelativeTime(post.createdAt);

  return (
    <article className="glass holo-border overflow-hidden rounded-[28px]">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#7dffe1]/40 bg-[#7dffe1]/10 font-display text-lg text-[#7dffe1]">
          {owner.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{owner}</p>
          <p className="text-xs text-[#93a8a2]">
            {categoryLabel(post.category)}
            {` · ${stamp}`}
          </p>
        </div>
        <Link
          href={`/collection/${post.id}`}
          className="tap tap-target flex items-center rounded-full border border-white/10 px-3 text-xs text-[#c9d9d4]"
        >
          Open
        </Link>
      </div>

      <Link href={`/collection/${post.id}`} className="tap block">
        <div className="aspect-square w-full overflow-hidden bg-black/40">
          <CardPhoto post={post} sizeHint="tall" />
        </div>
      </Link>

      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <LikeButton post={post} />
        <p className="text-right">
          <span className="font-display text-2xl text-[#e7c37a]">
            {formatMoney(post.estimatedValue)}
          </span>
        </p>
      </div>

      <div className="px-4 pb-4">
        <p className="text-sm">
          <span className="font-medium">{post.name}</span>
          {post.caption ? (
            <span className="text-[#c9d9d4]"> {post.caption}</span>
          ) : null}
        </p>
        <p className="mt-1 text-xs text-[#93a8a2]">
          {post.source === "ebay-sold"
            ? "eBay sold comps"
            : post.source === "ebay-active"
              ? "eBay asking prices"
              : "Catalog price"}
          {post.lastSold != null ? ` · last sold ${formatMoney(post.lastSold)}` : ""}
        </p>
      </div>
    </article>
  );
}
