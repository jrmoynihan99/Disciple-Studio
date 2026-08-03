"use client";

/**
 * Boot the dataset.
 *
 * The index travels over `fetch` through a real route, never as a server-
 * component prop. A prop would serialize ~14,400 rows into the Flight stream,
 * ship them as text inside the HTML document and parse them twice — and it could
 * be neither cached across navigations nor verified against a publish id. The
 * route exists from day one; at M5 only its SOURCE changes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { IndexRow } from "@/lib/leads/engine/types";

export interface DatasetPointer {
  publish_id: string;
  n_churches: number;
  index_url: string;
  source: "fixture" | "blob";
}

export interface DatasetState {
  rows: readonly IndexRow[];
  pointer: DatasetPointer | null;
  loading: boolean;
  /** Set on failure. The console shows this rather than an empty list. */
  error: string | null;
  /** A newer publish appeared while the tab was open. */
  updateAvailable: boolean;
  reload: () => void;
}

/** Survives a route change within the session, so going back is instant. */
let memoryCache: { publishId: string; rows: IndexRow[] } | null = null;

export function useDataset(): DatasetState {
  const [rows, setRows] = useState<readonly IndexRow[]>(memoryCache?.rows ?? []);
  const [pointer, setPointer] = useState<DatasetPointer | null>(null);
  const [loading, setLoading] = useState(!memoryCache);
  const [error, setError] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [nonce, setNonce] = useState(0);
  const loadedPublish = useRef<string | null>(memoryCache?.publishId ?? null);

  const reload = useCallback(() => {
    memoryCache = null;
    loadedPublish.current = null;
    setUpdateAvailable(false);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        const res = await fetch("/api/leads/dataset/current", { cache: "no-store" });
        if (!res.ok) throw new Error(`dataset pointer: ${res.status}`);
        const ptr: DatasetPointer = await res.json();
        if (cancelled) return;
        setPointer(ptr);

        // Same publish → the bytes cannot have changed. Skip the network.
        if (loadedPublish.current === ptr.publish_id && memoryCache) {
          setRows(memoryCache.rows);
          setLoading(false);
          return;
        }

        const idxRes = await fetch(ptr.index_url);
        if (!idxRes.ok) throw new Error(`index: ${idxRes.status}`);
        const data: IndexRow[] = await idxRes.json();
        if (cancelled) return;

        memoryCache = { publishId: ptr.publish_id, rows: data };
        loadedPublish.current = ptr.publish_id;
        setRows(data);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        // Never fall back to an empty list silently — that is indistinguishable
        // from "no churches matched", and this product does not guess.
        setError(err instanceof Error ? err.message : "could not load the dataset");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  /**
   * Poll for a new publish while the tab is visible.
   *
   * NEVER hot-swap the dataset under someone mid-scroll, and never with a
   * dossier open — a non-blocking banner offers the reload and the user chooses
   * when to take it.
   */
  useEffect(() => {
    if (!pointer) return;
    let stop = false;

    const check = async () => {
      if (document.visibilityState !== "visible" || stop) return;
      try {
        const res = await fetch("/api/leads/dataset/current", { cache: "no-store" });
        if (!res.ok) return;
        const ptr: DatasetPointer = await res.json();
        if (!stop && ptr.publish_id !== loadedPublish.current) setUpdateAvailable(true);
      } catch {
        /* a failed poll is not worth surfacing; the next one may succeed */
      }
    };

    const id = setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      stop = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [pointer]);

  return { rows, pointer, loading, error, updateAvailable, reload };
}
