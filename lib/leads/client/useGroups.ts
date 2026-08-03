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
import { EMPTY_MEMBERSHIP, isCollecting } from "@/lib/leads/engine/group-types";
import type {
  ExportGroup,
  ExportGroupSummary,
  GroupOp,
  Membership,
  MembershipRef,
} from "@/lib/leads/engine/group-types";

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
  /**
   * The write currently on the wire, or `null`.
   *
   * A PROMISE RATHER THAN A BOOLEAN, so a caller can JOIN a save already in
   * progress instead of being told "busy" and carrying on. With a boolean,
   * `await flush()` returned immediately whenever a debounced save happened to be
   * mid-flight — which reads as "everything is saved" and is the opposite of the
   * truth. `drain()` is only meaningful because of this.
   */
  private inFlight: Promise<void> | null = null;
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
    // Join the write already going out rather than starting a second one — see
    // `inFlight`. Returning here without awaiting was the bug.
    if (this.inFlight) return this.inFlight;
    if (!this.queue.length) return;

    this.inFlight = this.send(opts);
    try {
      await this.inFlight;
    } finally {
      this.inFlight = null;
      if (this.queue.length) this.schedule();
    }
  };

  /**
   * SEND EVERYTHING, AND SAY WHETHER IT LANDED.
   *
   * `flush` cannot answer that: it resolves the same way whether the PATCH
   * succeeded or failed and left the ops queued, because its callers are the
   * autosave timers and `pagehide`, which have nothing to do about a failure.
   * The export does — a demo built from a batch missing the reviewer's last three
   * corrections is precisely what this whole page exists to prevent — so it needs
   * a verb that can say no.
   *
   * Bounded rather than looping until clear: nothing can enqueue while the export
   * dialog is modal, so more than one extra pass means something is wrong and
   * spinning would just hide it.
   */
  drain = async (): Promise<boolean> => {
    for (let i = 0; i < 3; i++) {
      await this.flush();
      if (this.snap.save === "error") return false;
      if (!this.queue.length && !this.inFlight) return true;
    }
    return !this.queue.length && this.snap.save !== "error";
  };

  private send = async (opts: { keepalive?: boolean }): Promise<void> => {
    const sending = this.queue;
    this.queue = [];
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
  /**
   * AWAITABLE, so a caller that is about to reload the page can wait for the
   * write instead of guessing at a delay. Nothing forces you to await it — the
   * autosave path still fires and forgets.
   */
  flush: () => Promise<void>;
  /**
   * Flush, and report whether every queued op actually reached the server.
   *
   * For the one caller that must not proceed on a failure — the export. See
   * `GroupStore.drain`.
   */
  drain: () => Promise<boolean>;
  reload: () => void;
}

export function useGroup(id: string): GroupHandle {
  const s = storeFor(id);
  const snap = useSyncExternalStore(s.subscribe, s.getSnapshot, s.getServerSnapshot);
  const apply = useCallback((op: GroupOp) => s.apply(op), [s]);
  const flush = useCallback(() => s.flush(), [s]);
  const drain = useCallback(() => s.drain(), [s]);
  const reload = useCallback(() => void s.load(), [s]);
  return useMemo(
    () => ({ ...snap, apply, flush, drain, reload }),
    [snap, apply, flush, drain, reload],
  );
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
  /** Make this the batch ✆ collects into. `false` if it has already been sent. */
  switchTo: (groupId: string) => Promise<boolean>;
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

  /** The batch's display name, for an optimistic membership entry. */
  nameOf = (id: string): string | null =>
    this.snap.groups.find((g) => g.id === id)?.name ?? null;
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

  /**
   * Point ✆ at an existing batch.
   *
   * BOTH stores are reloaded, in that order. The list is what the picker draws;
   * membership is what `openGroupId` and the tray count come from, and it is
   * derived server-side from the same batches — so refreshing one and not the
   * other leaves the rail naming a batch the picker no longer highlights.
   */
  const switchTo = useCallback(
    async (groupId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/leads/groups/${groupId}/open`, { method: "POST" });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          s.fail(body?.error ?? "Could not switch to that batch.");
          return false;
        }
        await s.reload();
        await getMembershipStore().reload();
        return true;
      } catch {
        s.fail("Could not reach the server.");
        return false;
      }
    },
    [s],
  );

  return useMemo(
    () => ({ ...snap, reload, create, addChurches, remove, switchTo }),
    [snap, reload, create, addChurches, remove, switchTo],
  );
}

/* ------------------------------------------------------------------ *
 * Membership — what ✆ reads and writes
 * ------------------------------------------------------------------ */

/**
 * Which batches each church is in.
 *
 * Optimistic, and it has to be: ✆ is clicked twenty times in a session, and a
 * control that greys out for a round trip each time stops feeling like a control.
 * The row turns green immediately and the server reconciles; a failure rolls the
 * row back and says so rather than leaving a green row that was never saved.
 */
class MembershipStore {
  private snap: Membership = EMPTY_MEMBERSHIP;
  private listeners = new Set<() => void>();
  private started = false;
  private error = "";

  getSnapshot = (): Membership => this.snap;
  getServerSnapshot = (): Membership => EMPTY_MEMBERSHIP;
  getError = (): string => this.error;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    if (!this.started) {
      this.started = true;
      void this.reload();
    }
    return () => this.listeners.delete(fn);
  };

  private emit() {
    for (const fn of this.listeners) fn();
  }

  private set(next: Membership, error = "") {
    this.snap = next;
    this.error = error;
    this.emit();
  }

  reload = async (): Promise<void> => {
    try {
      const res = await fetch("/api/leads/groups/membership", { cache: "no-store" });
      if (!res.ok) {
        // Never fall back to an empty map: that would silently un-mark every row
        // and invite collecting the same church twice.
        this.set(this.snap, "Could not read your batches.");
        return;
      }
      this.set((await res.json()) as Membership);
    } catch {
      this.set(this.snap, "Could not reach the server.");
    }
  };

  /** The open batch, creating one if this is the first church of the day. */
  private async ensureOpen(): Promise<string | null> {
    if (this.snap.openGroupId) return this.snap.openGroupId;
    try {
      const res = await fetch("/api/leads/groups/open", { method: "POST" });
      if (!res.ok) return null;
      const g = (await res.json()) as ExportGroupSummary;
      this.set({ ...this.snap, openGroupId: g.id });
      void getListStore().reload();
      return g.id;
    } catch {
      return null;
    }
  }

  private localAdd(ids: string[], ref: MembershipRef): Membership {
    const byOrg = { ...this.snap.byOrg };
    for (const id of ids) {
      const cur = byOrg[id] ?? [];
      if (!cur.some((g) => g.id === ref.id)) byOrg[id] = [...cur, ref];
    }
    return { ...this.snap, byOrg };
  }

  private localRemove(ids: string[], groupId: string): Membership {
    const byOrg = { ...this.snap.byOrg };
    for (const id of ids) {
      const next = (byOrg[id] ?? []).filter((g) => g.id !== groupId);
      if (next.length) byOrg[id] = next;
      else delete byOrg[id];
    }
    return { ...this.snap, byOrg };
  }

  /** Put these churches in the open batch. Already-present ones are left alone. */
  collect = async (ids: string[]): Promise<void> => {
    if (!ids.length) return;
    const groupId = await this.ensureOpen();
    if (!groupId) {
      this.set(this.snap, "Could not open a batch.");
      return;
    }
    const fresh = ids.filter((id) => !(this.snap.byOrg[id] ?? []).some((g) => g.id === groupId));
    if (!fresh.length) return;

    const before = this.snap;
    const name = getListStore().nameOf(groupId) ?? "this batch";
    this.set(this.localAdd(fresh, { id: groupId, name, status: "open" }));

    try {
      const res = await fetch(`/api/leads/groups/${groupId}/churches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: fresh }),
      });
      if (!res.ok) {
        this.set(before, "Could not add to the batch.");
        return;
      }
      void getListStore().reload();
      // Re-read rather than trusting the optimistic copy: the server is the only
      // thing that knows what it actually skipped.
      void this.reload();
    } catch {
      this.set(before, "Offline — that church was not collected.");
    }
  };

  /** Take a church back out of the open batch. */
  uncollect = async (orgId: string): Promise<void> => {
    const groupId = this.snap.openGroupId;
    if (!groupId) return;
    const before = this.snap;
    this.set(this.localRemove([orgId], groupId));

    try {
      const res = await fetch(`/api/leads/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ops: [{ op: "church.remove", orgId }] }),
      });
      if (!res.ok) {
        this.set(before, "Could not remove that church.");
        return;
      }
      void getListStore().reload();
    } catch {
      this.set(before, "Offline — that church was not removed.");
    }
  };
}

let membershipStore: MembershipStore | null = null;

function getMembershipStore(): MembershipStore {
  if (!membershipStore) membershipStore = new MembershipStore();
  return membershipStore;
}

export interface MembershipHandle {
  membership: Membership;
  error: string;
  /** Toggle one church in or out of the open batch. */
  toggle: (orgId: string) => void;
  /** Bulk add — what shift-click produces. */
  collect: (ids: string[]) => void;
  reload: () => void;
}

export function useMembership(): MembershipHandle {
  const s = getMembershipStore();
  const membership = useSyncExternalStore(s.subscribe, s.getSnapshot, s.getServerSnapshot);
  const error = useSyncExternalStore(s.subscribe, s.getError, () => "");

  const toggle = useCallback(
    (orgId: string) => {
      if (isCollecting(membership, orgId)) void s.uncollect(orgId);
      else void s.collect([orgId]);
    },
    [s, membership],
  );
  const collect = useCallback((ids: string[]) => void s.collect(ids), [s]);
  const reload = useCallback(() => void s.reload(), [s]);

  return useMemo(
    () => ({ membership, error, toggle, collect, reload }),
    [membership, error, toggle, collect, reload],
  );
}

/** `u_<hex>` — the prefix is what makes provenance readable in a stored blob. */
export function newAddedId(): string {
  const rand = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
    : Math.random().toString(36).slice(2, 12);
  return `u_${rand.toLowerCase().replace(/[^a-z0-9]/g, "0")}`;
}
