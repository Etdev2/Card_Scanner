"use client";

import Link from "next/link";
import { usePost } from "@/lib/useCollection";
import { LoadingState } from "./CollectionUI";
import { PostDetail } from "./PostDetail";

export function PostDetailScreen({ id }: { id: string }) {
  const { post, ready } = usePost(id);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-3 py-4 sm:px-5 md:px-8 md:py-8">
      {!ready ? (
        <LoadingState label="Loading card…" />
      ) : post ? (
        <PostDetail post={post} />
      ) : (
        <div className="glass holo-border rounded-[28px] px-6 py-12 text-center">
          <h1 className="font-display text-2xl">Card not found</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#93a8a2]">
            This post is not on this device. Collections are local, so a link
            from another phone or browser will not open here.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              href="/collection"
              className="tap tap-target inline-flex items-center rounded-2xl border border-white/15 px-4 text-sm"
            >
              Back to collection
            </Link>
            <Link
              href="/"
              className="tap tap-target inline-flex items-center rounded-2xl bg-[#7dffe1] px-4 text-sm font-semibold text-[#071016]"
            >
              Scan a card
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
