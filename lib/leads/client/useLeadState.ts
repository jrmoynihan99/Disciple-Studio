"use client";

/**
 * The localStorage backend for `state.ts`, behind the exact interface the Blob
 * layer will implement.
 *
 * It is a real EXTERNAL STORE read through `useSyncExternalStore`, not
 * `useState` + an effect. That is not ceremony:
 *
 *  - the state is genuinely external (localStorage, later a server blob), so
 *    reading it in an effect and mirroring it into React state means an extra
 *    render on every mount and a second copy that can drift;
 *  - `useSyncExternalStore` gives a correct SSR snapshot for free, so the
 *    server renders "no marks" rather than mismatching;
 *  - it is the shape the Blob backend needs anyway — subscribe to a poll,
 *    re-snapshot, done.
 *
 * `mutate` is optimistic and returns void by design: no component can
 * accidentally gate a star click on a round trip. Persistence is debounced and
 * coalesced — rage-clicking a star ten times produces one write — and NEVER
 * coalesces across state types, so a notes flush cannot carry marks.
 */

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  emptyState,
  hydrate,
  persistable,
  reduce,
  withoutStaleExportLog,
  type LeadState,
  type Mutation,
} from "./state";

const KEY = "leads-state-v1";
const FLUSH_IDLE_MS = 400;

/**
 * Per-device id for the localStorage era. The server mints a signed, opaque id
 * on a cookie (see `lib/leads/identity.ts`); this is the local stand-in and
 * uses the same shape, so swapping backends changes nothing above.
 */
function localUserId(): string {
  try {
    const k = "leads-user-id";
    let v = localStorage.getItem(k);
    if (!v) {
      v = `u_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return "u_local";
  }
}

/** The snapshot the server renders: no marks, no notes, no overrides. */
const SERVER_SNAPSHOT = emptyState("u_server");


class LocalLeadStore {
  private snapshot: LeadState | null = null;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  getSnapshot = (): LeadState => {
    if (!this.snapshot) this.snapshot = this.load();
    return this.snapshot;
  };

  getServerSnapshot = (): LeadState => SERVER_SNAPSHOT;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  mutate = (m: Mutation): void => {
    this.snapshot = reduce(this.getSnapshot(), m, Date.now());
    this.emit();
    this.schedule();
  };

  reset = (): void => {
    this.snapshot = emptyState(localUserId());
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* nothing to clear */
    }
    this.emit();
  };

  /** Called on pagehide / visibilitychange so a pending write survives the tab. */
  flush = (): void => {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const s = this.snapshot;
    if (!s) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(persistable(s)));
    } catch {
      /* quota or private mode — the UI keeps working from memory */
    }
  };

  private emit() {
    for (const fn of this.listeners) fn();
  }

  private schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(this.flush, FLUSH_IDLE_MS);
  }

  /**
   * Reads the blob; `hydrate` decides what survives it. The split is deliberate:
   * everything below is untestable (localStorage), everything above it is pure
   * and is tested against the real function rather than a copy of its shape.
   */
  private load(): LeadState {
    const userId = localUserId();
    try {
      const raw = localStorage.getItem(KEY);
      const saved = raw ? JSON.parse(raw) : null;
      // Take the stub export's leftovers off the disk, not just out of memory.
      const cleaned = withoutStaleExportLog(saved);
      if (cleaned) localStorage.setItem(KEY, JSON.stringify(cleaned));
      return hydrate(saved, userId);
    } catch {
      return emptyState(userId);
    }
  }
}

/** One store per tab. */
let store: LocalLeadStore | null = null;

function getStore(): LocalLeadStore {
  if (!store) {
    store = new LocalLeadStore();
    if (typeof window !== "undefined") {
      const onHide = () => {
        if (document.visibilityState === "hidden") store?.flush();
      };
      document.addEventListener("visibilitychange", onHide);
      window.addEventListener("pagehide", () => store?.flush());
    }
  }
  return store;
}

export interface LeadStateStore {
  state: LeadState;
  mutate: (m: Mutation) => void;
  /** Wipes every mark, note and override. Used by the reset control only. */
  reset: () => void;
}

export function useLeadState(): LeadStateStore {
  const s = getStore();
  const state = useSyncExternalStore(s.subscribe, s.getSnapshot, s.getServerSnapshot);
  const mutate = useCallback((m: Mutation) => s.mutate(m), [s]);
  const reset = useCallback(() => s.reset(), [s]);
  return useMemo(() => ({ state, mutate, reset }), [state, mutate, reset]);
}
