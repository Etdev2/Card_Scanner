"use client";

import Link from "next/link";
import { useState } from "react";
import { dismissDemoPosts, toggleLike } from "@/lib/collection";
import type { CollectionPost } from "@/lib/types";

export function CardPhoto({
  post,
  className = "",
  sizeHint = "square",
}: {
  post: CollectionPost;
  className?: string;
  sizeHint?: "square" | "tall";
}) {
  if (post.imageDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={post.imageDataUrl}
        alt={post.name}
        loading="lazy"
        decoding="async"
        className={`h-full w-full bg-black/40 object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0d1f27] to-[#101826] ${className}`}
    >
      <span
        className={`font-display text-[#7dffe1]/60 ${
          sizeHint === "tall" ? "text-5xl" : "text-2xl"
        }`}
      >
        {post.name.slice(0, 1).toUpperCase()}
      </span>
    </div>
  );
}

export function LikeButton({
  post,
  withCount = true,
}: {
  post: CollectionPost;
  withCount?: boolean;
}) {
  const [popping, setPopping] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={post.liked}
      aria-label={post.liked ? "Unlike" : "Like"}
      onClick={() => {
        setPopping(true);
        window.setTimeout(() => setPopping(false), 320);
        void toggleLike(post.id);
      }}
      className="tap tap-target flex items-center gap-2 rounded-full px-2 text-sm text-[#c9d9d4]"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={`h-6 w-6 ${popping ? "heart-pop" : ""}`}
        fill={post.liked ? "#ff5d8f" : "none"}
        stroke={post.liked ? "#ff5d8f" : "currentColor"}
        strokeWidth="1.7"
      >
        <path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 3C19.5 15.4 12 20 12 20z" />
      </svg>
      {withCount ? <span>{post.likes}</span> : null}
    </button>
  );
}

export function DemoBanner({ posts }: { posts: CollectionPost[] }) {
  const [busy, setBusy] = useState(false);
  if (!posts.some((post) => post.demo)) return null;

  return (
    <div className="glass flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
      <p className="flex-1 text-sm text-[#c9d9d4]">
        These are sample cards so the app is not empty. Your real scans appear
        here instantly.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void dismissDemoPosts().finally(() => setBusy(false));
        }}
        className="tap tap-target flex items-center rounded-2xl border border-white/15 px-4 text-sm disabled:opacity-60"
      >
        {busy ? "Removing…" : "Remove demo cards"}
      </button>
    </div>
  );
}

export function CollectionEmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="glass holo-border rounded-[28px] px-6 py-12 text-center">
      <p className="text-xs uppercase tracking-[0.28em] text-[#7dffe1]/80">
        Nothing here yet
      </p>
      <h2 className="font-display mt-3 text-2xl md:text-3xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#93a8a2]">
        {body}
      </p>
      <Link
        href="/"
        className="tap tap-target mt-5 inline-flex items-center justify-center rounded-2xl bg-[#7dffe1] px-5 text-sm font-semibold text-[#071016]"
      >
        Scan your first card
      </Link>
    </div>
  );
}

export function LoadingState({ label = "Loading your collection…" }) {
  return (
    <div className="glass rounded-[28px] px-6 py-12 text-center text-sm text-[#93a8a2]">
      {label}
    </div>
  );
}
