"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deletePost, updatePost } from "@/lib/collection";
import { soldSearchUrl } from "@/lib/ebay";
import { lookupCard } from "@/lib/lookup";
import { categoryLabel } from "@/lib/query";
import { formatMoney } from "@/lib/stats";
import { formatDateTime, formatRelativeTime } from "@/lib/time";
import { CONDITIONS, type CollectionPost } from "@/lib/types";
import { CardPhoto, LikeButton } from "./CollectionUI";

/**
 * Instagram-style post detail. Used full-page at /collection/[id] and as the
 * right-hand panel of the grid on large screens.
 */
export function PostDetail({
  post,
  variant = "page",
}: {
  post: CollectionPost;
  variant?: "page" | "panel";
}) {
  const router = useRouter();
  const [caption, setCaption] = useState(post.caption ?? "");
  const [editingCaption, setEditingCaption] = useState(false);
  const [busy, setBusy] = useState<"" | "repricing" | "deleting" | "saving">("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  // Posts are device-local, so this subtree never renders on the server.
  const stamp = formatRelativeTime(post.createdAt);

  async function reprice() {
    setBusy("repricing");
    setError("");
    setNote("");
    try {
      const result = await lookupCard(post.query, {
        ocrText: post.ocrText ?? "",
        condition: post.condition,
      });
      await updatePost(post.id, {
        estimatedValue: result.estimate.estimated,
        lastSold: result.estimate.lastSold,
        source: result.estimate.source,
        name: post.demo ? result.card.name : post.name,
        demo: post.demo,
      });
      setNote(
        result.estimate.estimated == null
          ? "No fresh comps found. Kept the previous estimate."
          : `Re-priced from ${result.estimate.count} eBay comp${
              result.estimate.count === 1 ? "" : "s"
            }.`,
      );
    } catch (repriceError) {
      setError(
        repriceError instanceof Error
          ? repriceError.message
          : "Could not reach eBay comps right now.",
      );
    } finally {
      setBusy("");
    }
  }

  async function saveCaption() {
    setBusy("saving");
    try {
      await updatePost(post.id, { caption: caption.trim() || undefined });
      setEditingCaption(false);
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Delete this card from your collection?")
    ) {
      return;
    }
    setBusy("deleting");
    try {
      await deletePost(post.id);
      if (variant === "page") router.push("/collection");
    } finally {
      setBusy("");
    }
  }

  const conditionLabel =
    CONDITIONS.find((item) => item.id === post.condition)?.label ?? "Any";

  return (
    <article className="glass holo-border overflow-hidden rounded-[28px]">
      <div className="aspect-square w-full overflow-hidden bg-black/40">
        <CardPhoto post={post} sizeHint="tall" />
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#7dffe1]/80">
            {categoryLabel(post.category)} · {conditionLabel}
          </p>
          <h1 className="font-display mt-1 text-2xl leading-tight sm:text-3xl">
            {post.name}
          </h1>
          <p className="holo-text font-display mt-2 text-4xl">
            {formatMoney(post.estimatedValue)}
          </p>
          <p className="mt-1 text-xs text-[#93a8a2]">
            {post.source === "ebay-sold"
              ? "eBay sold comps"
              : post.source === "ebay-active"
                ? "eBay asking prices"
                : "Catalog price"}
            {post.lastSold != null
              ? ` · last sold ${formatMoney(post.lastSold)}`
              : ""}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-y border-white/10 py-1">
          <LikeButton post={post} />
          <p className="text-xs text-[#93a8a2]">
            {stamp}
          </p>
        </div>

        {editingCaption ? (
          <div className="space-y-2">
            <textarea
              value={caption}
              maxLength={280}
              rows={3}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Say something about this card…"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-base outline-none ring-[#7dffe1]/40 placeholder:text-[#93a8a2]/70 focus:ring-2"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void saveCaption()}
                disabled={busy === "saving"}
                className="tap tap-target flex items-center rounded-2xl bg-[#7dffe1] px-4 text-sm font-semibold text-[#071016] disabled:opacity-60"
              >
                {busy === "saving" ? "Saving…" : "Save caption"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCaption(post.caption ?? "");
                  setEditingCaption(false);
                }}
                className="tap tap-target flex items-center rounded-2xl border border-white/15 px-4 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCaption(post.caption ?? "");
              setEditingCaption(true);
            }}
            className="tap block w-full rounded-2xl border border-white/5 px-3 py-2 text-left text-sm text-[#c9d9d4] hover:border-white/15"
          >
            {post.caption || (
              <span className="text-[#93a8a2]">Add a caption…</span>
            )}
          </button>
        )}

        {note ? <p className="text-xs text-[#7dffe1]">{note}</p> : null}
        {error ? <p className="text-xs text-[#e7c37a]">{error}</p> : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void reprice()}
            disabled={busy === "repricing"}
            className="tap tap-target flex items-center justify-center rounded-2xl border border-[#7dffe1]/40 px-4 text-sm text-[#7dffe1] disabled:opacity-60"
          >
            {busy === "repricing" ? "Re-pricing…" : "Re-price from eBay"}
          </button>
          <a
            href={soldSearchUrl(post.query)}
            target="_blank"
            rel="noreferrer"
            className="tap tap-target flex items-center justify-center rounded-2xl border border-white/15 px-4 text-sm"
          >
            Open sold search
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-[#93a8a2]">
          <span>Saved {formatDateTime(post.createdAt)}</span>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy === "deleting"}
            className="tap tap-target flex items-center rounded-2xl border border-[#ff5d8f]/40 px-4 text-sm text-[#ff8fb0] disabled:opacity-60"
          >
            {busy === "deleting" ? "Deleting…" : "Delete"}
          </button>
        </div>

        {variant === "page" ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/collection"
              className="tap tap-target flex items-center rounded-2xl border border-white/15 px-4 text-sm"
            >
              Back to grid
            </Link>
            <Link
              href="/"
              className="tap tap-target flex items-center rounded-2xl bg-[#7dffe1] px-4 text-sm font-semibold text-[#071016]"
            >
              Scan another
            </Link>
          </div>
        ) : (
          <Link
            href={`/collection/${post.id}`}
            className="tap tap-target flex items-center justify-center rounded-2xl border border-white/15 px-4 text-sm"
          >
            Open full post
          </Link>
        )}
      </div>
    </article>
  );
}
