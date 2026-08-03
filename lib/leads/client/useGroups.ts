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

/**
 * A refusal that sending again cannot fix.
 *
 * 408 and 429 are "not now", not "no" — everything else in the 4xx range is the
 * server saying this operation is malformed or no longer legal, and it will say
 * so identically every 1.5s forever. Requeueing those was the bug: one rejected
 * op sat at the head of the queue and every later edit in the session queued
 * behind it and was never saved.
 */
const isPermanent = (status: number) =>
  status >= 400 && status < 500 && status !== 408 && status !== 429;

export interface GroupSnapshot {
  group: ExportGroup | null;
  loading: boolean;
  /**
   * THE BATCH COULD NOT BE READ. Fatal — there is nothing to draw.
   *
   * SEPARATE FROM `saveError`, and that separation is the fix for a page that
   * used to brick itself. One field carried both, and the review page treats it
   * as fatal, so the first PATCH the server refused replaced twenty cards, the
   * pending counter, the export bar and the frozen banner with "This group could
   * not be loaded" — about a group that had loaded perfectly.
   */
  loadError: string;
  /**
   * A WRITE WAS REFUSED. Not fatal: the page still holds everything it read.
   *
   * Rendered in the save indicator the nav already draws, which is where
   * somebody looks to decide whether it is safe to close the tab.
   */
  saveError: string;
  save: SaveState;
  /** Ops written locally but not yet acknowledged by the server. */
  pending: number;
}

const EMPTY: GroupSnapshot = {
  group: null,
  loading: true,
  loadError: "",
  saveError: "",
  save: "idle",
  pending: 0,
};

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
  /**
   * The ops currently on the wire — no longer in `queue`, not yet acknowledged.
   *
   * Held separately because `load()` has to fold them back on top of the server
   * copy: for the length of a round trip they are edits the reviewer can see and
   * the server has not got, and a `load()` during that window used to erase them
   * from the screen while they were still travelling.
   */
  private sending: GroupOp[] = [];
  private channel: BroadcastChannel | null = null;

  constructor(private id: string) {
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (e: MessageEvent<{ id: string; rev: number }>) => {
        // Another tab of the same user saved. There is no compare-and-swap to
        // lean on, so the fix for the only real race is to notice and re-read.
        //
        // `sending` IS CHECKED TOO, not just `queue`. `send()` empties the queue
        // into a local array before it awaits, so for the whole round trip the
        // queue guard passed while ops were on the wire — and the re-read then
        // painted a server copy that did not contain them yet. The ops still
        // landed, so the server kept the correction while the screen silently
        // reverted it.
        const busy = this.queue.length > 0 || this.sending.length > 0;
        if (e.data?.id === this.id && e.data.rev > (this.snap.group?.rev ?? -1) && !busy) {
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

  /**
   * PUT THE UNSAVED EDITS BACK ON TOP OF WHAT THE SERVER SENT.
   *
   * `load()` is not only the first read. It is what the review page's `retry`
   * button calls, what a `BroadcastChannel` rev calls, and what a refused write
   * calls — and in all three the client may be holding operations the server has
   * never seen. Overwriting `snap.group` with the server copy threw away their
   * optimistic fold while leaving them in the queue to be sent anyway, so the
   * cards showed the pre-edit text and the stored batch — and any demo built
   * from it — ended up carrying text the reviewed card no longer displayed.
   * That is the one thing this page exists to prevent, reached from its only
   * visible escape hatch.
   */
  private refold(server: ExportGroup): ExportGroup {
    const unsaved = [...this.sending, ...this.queue];
    if (!unsaved.length) return server;
    const now = Date.now();
    let g = server;
    for (const op of unsaved) g = applyOp(g, op, now);
    return g;
  }

  load = async (): Promise<void> => {
    try {
      const res = await fetch(`/api/leads/groups/${this.id}`, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        this.set({
          loading: false,
          loadError: body?.error ?? `Could not load this group (${res.status})`,
        });
        return;
      }
      const server = (await res.json()) as ExportGroup;
      this.set({ group: this.refold(server), loading: false, loadError: "" });
    } catch {
      this.set({ loading: false, loadError: "Could not reach the server." });
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
    /**
     * JOIN THE WRITE ALREADY GOING OUT, THEN SEND WHAT IS STILL QUEUED.
     *
     * Returning the join on its own was the bug, and both callers that await
     * this destroy the page immediately afterwards: `pagehide`'s keepalive save
     * sent nothing whenever it landed mid-autosave, and `onRemoveChurch`
     * reloaded the window with the removal still sitting in the queue. The
     * window is not narrow — clicking Remove blurs the open field, which starts
     * the 1.5s debounce, and reading the confirm dialog takes longer than that.
     */
    while (this.inFlight) await this.inFlight;
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
    this.sending = sending;
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
        const why = body?.error ?? `Could not save (${res.status})`;

        /**
         * A REFUSAL IS NOT A RETRY. See `isPermanent`.
         *
         * Holding the ops looked like the careful choice — "losing an edit
         * quietly is the worst outcome" — but the server had already decided,
         * and holding them meant resending the same rejected body every 1.5s
         * with no cap and no backoff while every later edit queued behind it.
         * Nothing was saved after that point and nothing said so.
         *
         * So: drop them, name them, and RE-READ so the screen shows what the
         * server actually holds. Losing the edit loudly beats a page that looks
         * like it is still working. `save` stays `error`, which is what blocks
         * the export, until a later write succeeds.
         */
        if (isPermanent(res.status)) {
          this.sending = [];
          this.set({
            save: "error",
            saveError: `${why}. That change was refused and has not been saved.`,
            pending: this.queue.length,
          });
          await this.load();
          return;
        }

        // Retryable: hold them and show the count.
        this.queue = [...sending, ...this.queue];
        this.sending = [];
        this.set({ save: "error", saveError: why, pending: this.queue.length });
        return;
      }
      const { rev } = (await res.json()) as { rev: number };
      this.sending = [];
      this.channel?.postMessage({ id: this.id, rev });
      this.set({
        save: this.queue.length ? "pending" : "idle",
        saveError: "",
        pending: this.queue.length,
      });
    } catch {
      this.queue = [...sending, ...this.queue];
      this.sending = [];
      this.set({
        save: "error",
        saveError: "Offline — your changes are held.",
        pending: this.queue.length,
      });
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

  /**
   * Put these churches in the open batch. Already-present ones are left alone.
   *
   * IT REPORTS WHETHER THE SERVER TOOK THEM. The row click ignores the answer —
   * gating a ✆ on a round trip is what the optimistic path exists to avoid — but
   * the legacy-marks bar cannot: it DELETES the retired marks from localStorage
   * once the move is done, and it was doing that while the POST was still in
   * flight, because the handle it awaited returned synchronously. Offline, the
   * bar reported success, the batch got nothing, and the marks were gone. That
   * bar's whole stated purpose is that they must not simply vanish.
   */
  collect = async (ids: string[]): Promise<boolean> => {
    if (!ids.length) return true;
    const groupId = await this.ensureOpen();
    if (!groupId) {
      this.set(this.snap, "Could not open a batch.");
      return false;
    }
    const fresh = ids.filter((id) => !(this.snap.byOrg[id] ?? []).some((g) => g.id === groupId));
    if (!fresh.length) return true;

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
        return false;
      }
      void getListStore().reload();
      // Re-read rather than trusting the optimistic copy: the server is the only
      // thing that knows what it actually skipped.
      void this.reload();
      return true;
    } catch {
      this.set(before, "Offline — that church was not collected.");
      return false;
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
  /**
   * Bulk add — a deliberate action with a count in front of it, not a keystroke.
   *
   * AWAITABLE, unlike `toggle`. Its one caller discards local data on success,
   * so it has to be able to find out whether there was one. `false` means the
   * churches are NOT in the batch and the store is showing why.
   */
  collect: (ids: string[]) => Promise<boolean>;
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
  const collect = useCallback((ids: string[]) => s.collect(ids), [s]);
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
