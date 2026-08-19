"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { seedDemoPosts, setDisplayName } from "@/lib/collection";
import { formatMoney } from "@/lib/stats";
import { useCollection } from "@/lib/useCollection";
import type { CollectionPost } from "@/lib/types";
import {
  CardPhoto,
  CollectionEmptyState,
  DemoBanner,
  LoadingState,
} from "./CollectionUI";
import { PostDetail } from "./PostDetail";

export function CollectionScreen() {
  const { posts, profile, totals, ready } = useCollection();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wideScreen, setWideScreen] = useState(false);

  useEffect(() => {
    void seedDemoPosts();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setWideScreen(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const selected: CollectionPost | null =
    posts.find((post) => post.id === selectedId) ?? posts[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-5 md:px-8 md:py-8">
      <ProfileHeader
        displayName={profile.displayName}
        count={totals.count}
        totalValue={totals.totalValue}
        ready={ready}
      />

      <div className="mt-4 space-y-4">
        <DemoBanner posts={posts} />
      </div>

      {!ready ? (
        <div className="mt-4">
          <LoadingState />
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-4">
          <CollectionEmptyState
            title="No cards saved yet"
            body="Every card you scan can be saved here with its photo, value, and caption. Nothing leaves this device."
          />
        </div>
      ) : (
        <div className="mt-4 gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start">
          <ul className="grid grid-cols-3 gap-1 sm:gap-2">
            {posts.map((post) => (
              <li key={post.id} className="relative">
                <Link
                  href={`/collection/${post.id}`}
                  onClick={(event) => {
                    if (wideScreen) {
                      event.preventDefault();
                      setSelectedId(post.id);
                    }
                  }}
                  aria-current={
                    wideScreen && selected?.id === post.id ? "true" : undefined
                  }
                  className={`tap block aspect-square overflow-hidden rounded-lg border sm:rounded-xl ${
                    wideScreen && selected?.id === post.id
                      ? "border-[#7dffe1]"
                      : "border-white/5"
                  }`}
                >
                  <CardPhoto post={post} />
                </Link>
                <span className="pointer-events-none absolute bottom-1 left-1 rounded-md bg-[#071016]/80 px-1.5 py-0.5 text-[10px] font-medium text-[#e7c37a]">
                  {formatMoney(post.estimatedValue)}
                </span>
                {post.liked ? (
                  <span className="pointer-events-none absolute right-1 top-1 text-xs">
                    ❤️
                  </span>
                ) : null}
              </li>
            ))}
          </ul>

          <aside className="hidden lg:block">
            {selected ? (
              <div className="sticky top-24">
                <PostDetail
                  key={selected.id}
                  post={selected}
                  variant="panel"
                />
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}

function ProfileHeader({
  displayName,
  count,
  totalValue,
  ready,
}: {
  displayName: string;
  count: number;
  totalValue: number;
  ready: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayName);

  return (
    <header className="glass holo-border rounded-[28px] p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#7dffe1]/40 bg-[#7dffe1]/10 font-display text-2xl text-[#7dffe1] sm:h-20 sm:w-20 sm:text-3xl">
          {displayName.slice(0, 1).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          {editing ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void setDisplayName(draft);
                setEditing(false);
              }}
              className="flex gap-2"
            >
              <input
                autoFocus
                value={draft}
                maxLength={40}
                onChange={(event) => setDraft(event.target.value)}
                className="min-h-11 min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-3 text-base outline-none ring-[#7dffe1]/40 focus:ring-2"
              />
              <button
                type="submit"
                className="tap tap-target flex items-center rounded-2xl bg-[#7dffe1] px-4 text-sm font-semibold text-[#071016]"
              >
                Save
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(displayName);
                setEditing(true);
              }}
              className="tap flex min-h-11 items-center gap-2 text-left"
            >
              <span className="font-display truncate text-2xl sm:text-3xl">
                {displayName}
              </span>
              <span className="text-xs text-[#93a8a2]">Edit</span>
            </button>
          )}

          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex items-baseline gap-1.5">
              <dt className="text-[#93a8a2]">Cards</dt>
              <dd className="font-semibold">{ready ? count : "—"}</dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="text-[#93a8a2]">Est. value</dt>
              <dd className="font-semibold text-[#e7c37a]">
                {ready ? formatMoney(totalValue) : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="chip-rail mt-4">
        <Link
          href="/"
          className="tap tap-target flex items-center rounded-2xl bg-[#7dffe1] px-4 text-sm font-semibold text-[#071016]"
        >
          Scan a card
        </Link>
        <Link
          href="/feed"
          className="tap tap-target flex items-center rounded-2xl border border-white/15 px-4 text-sm"
        >
          Open feed
        </Link>
        <span className="tap-target flex items-center rounded-2xl border border-white/10 px-4 text-xs text-[#93a8a2]">
          Stored on this device only
        </span>
      </div>
    </header>
  );
}
