"use client";

import Link from "next/link";
import { useState } from "react";
import { addPost, compressImage } from "@/lib/collection";
import type { CardCondition, ScanResult } from "@/lib/types";

/**
 * Primary CTA after any successful scan or search: save the card into the
 * on-device collection as an Instagram-style post.
 */
export function AddToCollection({
  result,
  preview,
  condition,
}: {
  result: ScanResult;
  preview: string | null;
  condition: CardCondition;
}) {
  const [caption, setCaption] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  async function save() {
    setState("saving");
    setError("");
    try {
      const rawImage = preview || result.card.imageUrl || null;
      const imageDataUrl = rawImage ? await compressImage(rawImage) : null;
      const post = await addPost({
        imageDataUrl,
        name: result.card.name,
        query: result.card.query,
        category: result.card.category,
        condition,
        caption: caption.trim() || undefined,
        estimatedValue: result.estimate.estimated,
        lastSold: result.estimate.lastSold,
        source: result.estimate.source,
        ocrText: result.ocrText || undefined,
      });
      setSavedId(post.id);
      setState("saved");
    } catch (saveError) {
      setState("error");
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save to this device.",
      );
    }
  }

  if (state === "saved") {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#7dffe1]/30 bg-[#7dffe1]/10 px-4 py-3">
        <p className="flex-1 text-sm text-[#7dffe1]">
          Saved to your collection. Keep scanning — it stays on this device.
        </p>
        <Link
          href={savedId ? `/collection/${savedId}` : "/collection"}
          className="tap tap-target flex items-center rounded-2xl border border-[#7dffe1]/40 px-4 text-sm text-[#7dffe1]"
        >
          View post
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="holoscan-caption" className="sr-only">
        Caption
      </label>
      <input
        id="holoscan-caption"
        value={caption}
        onChange={(event) => setCaption(event.target.value)}
        placeholder="Add a caption (optional)"
        maxLength={180}
        className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-base outline-none ring-[#7dffe1]/40 placeholder:text-[#93a8a2]/70 focus:ring-2"
      />
      <button
        type="button"
        onClick={() => void save()}
        disabled={state === "saving"}
        className="tap tap-target flex w-full items-center justify-center rounded-2xl bg-[#7dffe1] px-5 text-sm font-semibold text-[#071016] transition hover:bg-[#a5ffec] disabled:opacity-60"
      >
        {state === "saving" ? "Saving…" : "Add to collection"}
      </button>
      {error ? <p className="text-xs text-[#e7c37a]">{error}</p> : null}
    </div>
  );
}
