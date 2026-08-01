"use client";

/**
 * The client half of export groups.
 *
 * Same shape as `useLeadState`: a real external store read through
 * `useSyncExternalStore`, with an optimistic `apply` that returns void so no
 * component can gate a keystroke on a round trip. The differences are all
 * consequences of the backend being a blob rather than localStorage.
 *
 * WHAT GETS SENT: operations, never the group. A 40-church group is ~210 KB and
 * the last-chance save on `pagehide` uses `keepalive`, which the Fetch spec caps
 * at 64 KiB — so posting the group back would silently fail to save on all but
 * the smallest groups. An op is a few hundred bytes and always fits.
 *
 * SEPARATE STORE, deliberately. `leads-state-v1` holds marks, notes and config
 * in localStorage; this holds groups on the server. Sharing one flush would mean
 * a group save carrying marks, which the write contract forbids: "never coalesce
 * across state types".
 */

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { applyOp } from "@/lib/leads/engine/group";
import type { ExportGroup, ExportGroupSummary, GroupOp } from "@/lib/leads/engine/group-types";

/** Idle debounce, matching the notes contract in docs/05-SHARED-STATE.md. */
const FLUSH_IDLE_MS = 1_500;
/** …and its ceiling, so continuous typing still reaches the server. */
const FLUSH_MAX_MS = 10_000;
/** One retry, then hold the ops and say so. */
const RETRY_MS = 2_000;

const CHANNEL = "leads-groups";

export type SaveState = "idle" | "saving" | "pending" | "error";

export interface GroupSnapshot {
  group: ExportGroup | null;
  loading: boolean;
  /** A real message, never a silent failure. */
  error: string;
  save: SaveState;
  /** Ops written locally but not yet acknowledged by the server. */
  pending: number;
}

const EMPTY: GroupSnapshot = { group: null, loading: true, error: "", save: "idle", pending: 0 };

class GroupStore {
  private snap: GroupSnapshot = EMPTY;
  private listeners = new Set<() => void>();
  private queue: GroupOp[] = [];
  private idle: ReturnType<typeof setTimeout> | null = null;
  private ceiling: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private channel: BroadcastChannel | null = null;

  constructor(private id: string) {
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (e: MessageEvent<{ id: string; rev: number }>) => {
        // Another tab of the same user saved. There is no compare-and-swap to
        // lean on, so the fix for the only real race is to notice and re-read.
        if (e.data?.id === this.id && e.data.rev > (this.snap.group?.rev ?? -1) && !this.queue.length) {
          void this.load();
        }
      };
    }
  }

  getSnapshot = (): GroupSnapshot => this.snap;
  getServerSnapshot = (): GroupSnapshot => EMPTY;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private set(patch: Partial<GroupSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    for (const fn of this.listeners) fn();
  }

  load = async (): Promise<void> => {
    try {
      const res = await fetch(`/api/leads/groups/${this.id}`, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        this.set({ loading: false, error: body?.error ?? `Could not load this group (${res.status})` });
        return;
      }
      this.set({ group: (await res.json()) as ExportGroup, loading: false, error: "" });
    } catch {
      this.set({ loading: false, error: "Could not reach the server." });
    }
  };

  /**
   * Apply an operation now, send it soon.
   *
   * The local fold uses the same pure `applyOp` the server will use, so the
   * screen and the blob cannot disagree about what an edit meant.
   */
  apply = (op: GroupOp): void => {
    const g = this.snap.group;
    if (!g) return;
    this.queue.push(op);
    this.set({
      group: applyOp(g, op, Date.now()),
      save: "pending",
      pending: this.queue.length,
    });
    this.schedule();
  };

  private schedule() {
    if (this.idle) clearTimeout(this.idle);
    this.idle = setTimeout(this.flush, FLUSH_IDLE_MS);
    // Without a ceiling, someone typing steadily for a minute never saves at all.
    if (!this.ceiling) this.ceiling = setTimeout(this.flush, FLUSH_MAX_MS);
  }

  private clearTimers() {
    if (this.idle) clearTimeout(this.idle);
    if (this.ceiling) clearTimeout(this.ceiling);
    this.idle = null;
    this.ceiling = null;
  }

  /** `keepalive` so a save survives the tab closing. Legal only because the
   *  body is a delta — see the note at the top of this file. */
  flush = async (opts: { keepalive?: boolean } = {}): Promise<void> => {
    this.clearTimers();
    if (this.inFlight || !this.queue.length) return;

    const sending = this.queue;
    this.queue = [];
    this.inFlight = true;
    this.set({ save: "saving" });

    const send = () =>
      fetch(`/api/leads/groups/${this.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ops: sending }),
        keepalive: !!opts.keepalive,
      });

    try {
      let res = await send();
      // One retry — a full-blob overwrite is idempotent, so replaying is free.
      if (!res.ok && res.status >= 500) {
        await new Promise((r) => setTimeout(r, RETRY_MS));
        res = await send();
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        // Put them back. Losing an edit quietly is the worst outcome here, so
        // the ops are held and the count is shown rather than dropped.
        this.queue = [...sending, ...this.queue];
        this.set({
          save: "error",
          error: body?.error ?? `Could not save (${res.status})`,
          pending: this.queue.length,
        });
        return;
      }
      const { rev } = (await res.json()) as { rev: number };
      this.channel?.postMessage({ id: this.id, rev });
      this.set({
        save: this.queue.length ? "pending" : "idle",
        error: "",
        pending: this.queue.length,
      });
    } catch {
      this.queue = [...sending, ...this.queue];
      this.set({ save: "error", error: "Offline — your changes are held.", pending: this.queue.length });
    } finally {
      this.inFlight = false;
      if (this.queue.length) this.schedule();
    }
  };
}

const stores = new Map<string, GroupStore>();

function storeFor(id: string): GroupStore {
  let s = stores.get(id);
  if (!s) {
    s = new GroupStore(id);
    stores.set(id, s);
    if (typeof window !== "undefined") {
      void s.load();
      const onHide = () => {
        if (document.visibilityState === "hidden") void s!.flush({ keepalive: true });
      };
      document.addEventListener("visibilitychange", onHide);
      window.addEventListener("pagehide", () => void s!.flush({ keepalive: true }));
    }
  }
  return s;
}

export interface GroupHandle extends GroupSnapshot {
  apply: (op: GroupOp) => void;
  flush: () => void;
  reload: () => void;
}

export function useGroup(id: string): GroupHandle {
  const s = storeFor(id);
  const snap = useSyncExternalStore(s.subscribe, s.getSnapshot, s.getServerSnapshot);
  const apply = useCallback((op: GroupOp) => s.apply(op), [s]);
  const flush = useCallback(() => void s.flush(), [s]);
  const reload = useCallback(() => void s.load(), [s]);
  return useMemo(() => ({ ...snap, apply, flush, reload }), [snap, apply, flush, reload]);
}

/* ------------------------------------------------------------------ *
 * The list, for the picker
 * ------------------------------------------------------------------ */

export interface GroupListHandle {
  groups: ExportGroupSummary[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  create: (name: string) => Promise<string | null>;
  addChurches: (
    groupId: string,
    ids: string[],
  ) => Promise<{ added: string[]; skipped: { id: string; reason: string }[] } | null>;
  remove: (groupId: string) => Promise<boolean>;
}

interface ListSnapshot {
  groups: ExportGroupSummary[];
  loading: boolean;
  error: string;
}

const EMPTY_LIST: ListSnapshot = { groups: [], loading: true, error: "" };

/**
 * The list is an external store too, and for the same reason the group is: the
 * rail and the review page both want it, and a fetch fired from an effect in
 * each of them would race and double-load. Subscribing IS the load trigger,
 * which is what an external store is for.
 */
class GroupListStore {
  private snap: ListSnapshot = EMPTY_LIST;
  private listeners = new Set<() => void>();
  private started = false;

  getSnapshot = (): ListSnapshot => this.snap;
  getServerSnapshot = (): ListSnapshot => EMPTY_LIST;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    if (!this.started) {
      this.started = true;
      void this.reload();
    }
    return () => this.listeners.delete(fn);
  };

  private set(patch: Partial<ListSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    for (const fn of this.listeners) fn();
  }

  reload = async (): Promise<void> => {
    try {
      const res = await fetch("/api/leads/groups", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        this.set({ loading: false, error: body?.error ?? "Could not load your groups." });
        return;
      }
      this.set({ groups: (await res.json()) as ExportGroupSummary[], loading: false, error: "" });
    } catch {
      this.set({ loading: false, error: "Could not reach the server." });
    }
  };

  fail = (message: string) => this.set({ error: message });
}

let listStore: GroupListStore | null = null;

function getListStore(): GroupListStore {
  if (!listStore) listStore = new GroupListStore();
  return listStore;
}

export function useGroupList(): GroupListHandle {
  const s = getListStore();
  const snap = useSyncExternalStore(s.subscribe, s.getSnapshot, s.getServerSnapshot);

  const reload = useCallback(() => s.reload(), [s]);

  const create = useCallback(
    async (name: string): Promise<string | null> => {
      try {
        const res = await fetch("/api/leads/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          s.fail(body?.error ?? "Could not create the group.");
          return null;
        }
        const { id } = (await res.json()) as { id: string };
        await s.reload();
        return id;
      } catch {
        s.fail("Could not reach the server.");
        return null;
      }
    },
    [s],
  );

  const addChurches = useCallback(
    async (groupId: string, ids: string[]) => {
      try {
        const res = await fetch(`/api/leads/groups/${groupId}/churches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          s.fail(body?.error ?? "Could not add those churches.");
          return null;
        }
        const out = (await res.json()) as {
          added: string[];
          skipped: { id: string; reason: string }[];
        };
        await s.reload();
        return out;
      } catch {
        s.fail("Could not reach the server.");
        return null;
      }
    },
    [s],
  );

  const remove = useCallback(
    async (groupId: string) => {
      try {
        const res = await fetch(`/api/leads/groups/${groupId}`, { method: "DELETE" });
        if (!res.ok) return false;
        await s.reload();
        return true;
      } catch {
        return false;
      }
    },
    [s],
  );

  return useMemo(
    () => ({ ...snap, reload, create, addChurches, remove }),
    [snap, reload, create, addChurches, remove],
  );
}

/** `u_<hex>` — the prefix is what makes provenance readable in a stored blob. */
export function newAddedId(): string {
  const rand = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
    : Math.random().toString(36).slice(2, 12);
  return `u_${rand.toLowerCase().replace(/[^a-z0-9]/g, "0")}`;
}
