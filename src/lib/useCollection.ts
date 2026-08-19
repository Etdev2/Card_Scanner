"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  computeTotals,
  hydrate,
  isHydrated,
  snapshotPosts,
  snapshotProfile,
  subscribe,
} from "./collection";
import type {
  CollectionPost,
  CollectionProfile,
  CollectionTotals,
} from "./types";

const EMPTY: CollectionPost[] = [];
const SERVER_PROFILE: CollectionProfile = {
  displayName: "My collection",
  updatedAt: 0,
};

export interface UseCollection {
  posts: CollectionPost[];
  profile: CollectionProfile;
  totals: CollectionTotals;
  ready: boolean;
}

/** Live view of the on-device collection. Re-renders on every local write. */
export function useCollection(): UseCollection {
  const getServerPosts = useCallback(() => EMPTY, []);
  const posts = useSyncExternalStore(subscribe, snapshotPosts, getServerPosts);
  const getServerProfile = useCallback(() => SERVER_PROFILE, []);
  const profile = useSyncExternalStore(
    subscribe,
    snapshotProfile,
    getServerProfile,
  );
  const getServerReady = useCallback(() => false, []);
  const ready = useSyncExternalStore(subscribe, isHydrated, getServerReady);

  useEffect(() => {
    void hydrate();
  }, []);

  const totals = useMemo(() => computeTotals(posts), [posts]);

  return { posts, profile, totals, ready };
}

/** One post by id, plus a loading flag while the device store hydrates. */
export function usePost(id: string): {
  post: CollectionPost | null;
  ready: boolean;
} {
  const { posts, ready } = useCollection();
  const post = useMemo(
    () => posts.find((item) => item.id === id) ?? null,
    [posts, id],
  );
  return { post, ready };
}
