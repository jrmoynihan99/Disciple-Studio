"use client";

/**
 * The state layer.
 *
 * ONE interface, two backends: `localStorage` today, Vercel Blob later, with no
 * component change. Everything a component touches goes through `getState()` /
 * `mutate()`.
 *
 * MARKS ARE MONOTONIC AND NOTHING IS EVER DELETED ON EXPORT. That is the whole
 * trick, and it is what removes the need for a transaction on a store with no
 * compare-and-swap:
 *
 *     downloaded(org) = org in lastExportedAt
 *
 * Consequences, all free: nobody ever writes to another user's blob, and export
 * mutates no marks at all.
 *
 * THE QUEUE MOVED. `pending(org)` used to live here, over a `goodlead` mark, and
 * it never worked: `export.commit` has no dispatcher, so `lastExportedAt` is
 * permanently `{}` and the comparison always reduced to "is it marked". The
 * queue is now a BATCH — `lib/leads/engine/group-types.ts` — which is persistent,
 * server-side and the thing an export will actually read. `lastExportedAt` and
 * `export.commit` stay exactly as they are: they are the export log's shape, and
 * ◎ stays correctly dormant until something writes it.
 */

import type { FavorModel, VerdictState } from "@/lib/leads/engine/types";

export type OrgId = string;

/**
 * TWO marks, not three.
 *
 * `goodlead` used to live here and meant "the export queue" — but the queue it
 * named was never real: `export.commit` had no dispatcher, so `lastExportedAt`
 * stayed `{}` forever and `isPending` collapsed to plain `isMarked`. It was a
 * queue with nothing behind it.
 *
 * A batch (`lib/leads/engine/group-types.ts`) is that queue, for real: persistent,
 * server-side, per-user, and the thing the export will actually read. So ✆ now
 * collects into a batch and the mark is gone. Membership, not a mark, answers
 * "is this church queued".
 */
export type MarkKind = "star" | "issue";

/** org_id -> marked_at (ms). NEVER an array — the timestamp is what makes it work. */
export type MarkSet = Record<OrgId, number>;

export type ColorOverrides = Partial<Record<string, Record<string, VerdictState>>>;

export interface TeamConfig {
  colors: ColorOverrides;
  favor: FavorModel | null;
  editedBy?: string;
  editedAt?: number;
}

export interface LeadState {
  userId: string;
  mine: Record<MarkKind, MarkSet>;
  /** Folded across users. Same shape; at 1 user it equals `mine`. */
  team: Record<MarkKind, MarkSet>;
  /**
   * DERIVED from the export log. Readonly, and no Mutation touches it — that is
   * what makes ◎ unsettable by construction rather than by convention.
   */
  lastExportedAt: Readonly<MarkSet>;
  notes: Record<OrgId, string>;
  config: TeamConfig;
}

export type Mutation =
  | { type: "mark.toggle"; kind: MarkKind; orgId: OrgId }
  | { type: "note.set"; orgId: OrgId; text: string }
  | { type: "config.color.set"; q: string; answer: string; state: VerdictState | null }
  | { type: "config.favor.set"; favor: FavorModel | null }
  | { type: "export.commit"; ids: OrgId[]; at: number };

export type RowTint = "issue" | "collecting" | "exported" | "star";

/** Where a row's collect state comes from now — batch membership, not a mark. */
export interface CollectView {
  collecting: boolean;
  earlier: boolean;
}

const NOT_COLLECTED: CollectView = { collecting: false, earlier: false };

/* ------------------------------------------------------------- selectors */

/** The newest mark across every user. */
export function markedAt(s: LeadState, kind: MarkKind, id: OrgId): number {
  return Math.max(s.mine[kind][id] ?? 0, s.team[kind][id] ?? 0);
}

export function isMarked(s: LeadState, kind: MarkKind, id: OrgId): boolean {
  return markedAt(s, kind, id) > 0;
}

export function isDownloaded(s: LeadState, id: OrgId): boolean {
  return id in s.lastExportedAt;
}

/**
 * issue > collecting > exported > star.
 *
 * `collecting` outranks `exported` ON PURPOSE, and for the same reason the old
 * good-lead tint did: collecting an already-exported church again is a real
 * action, and if `exported` won, the click would produce no visible change and
 * read as a dead control.
 *
 * A church in an EARLIER batch gets no tint. It is not part of today's work; it
 * says so on its own line and sinks to the bottom of the list instead.
 */
export function rowTint(s: LeadState, id: OrgId, collect: CollectView = NOT_COLLECTED): RowTint | null {
  if (isMarked(s, "issue", id)) return "issue";
  if (collect.collecting) return "collecting";
  if (isDownloaded(s, id)) return "exported";
  if (isMarked(s, "star", id)) return "star";
  return null;
}

export function countMarked(s: LeadState, kind: MarkKind): number {
  return new Set([...Object.keys(s.mine[kind]), ...Object.keys(s.team[kind])]).size;
}

export function emptyState(userId: string): LeadState {
  return {
    userId,
    mine: { star: {}, issue: {} },
    team: { star: {}, issue: {} },
    lastExportedAt: {},
    notes: {},
    config: { colors: {}, favor: null },
  };
}

/**
 * Churches carrying the retired ✆ mark, newest first.
 *
 * Read only so the console can OFFER to move them into a batch. Nothing here
 * silently invents a group from stale data — see the migration bar in
 * `LeadConsole`.
 */
export function legacyGoodLeadIds(raw: unknown): OrgId[] {
  const mine = (raw as { mine?: Record<string, Record<string, number>> } | null)?.mine;
  const set = mine?.goodlead;
  if (!set || typeof set !== "object") return [];
  return Object.entries(set)
    .filter(([, at]) => typeof at === "number" && at > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

/* ------------------------------------------------------- load and persist */

/**
 * A saved profile, turned back into state.
 *
 * PURE, AND HERE RATHER THAN IN THE STORE, because the store's copy sat behind
 * `localStorage` and could only be tested by re-implementing it — which is a
 * test of the copy, not of the loader that ships.
 *
 * This file has no schema, no version and no whitelist, so anything not named
 * below rides back in on the spread and `persistable()` writes it out again on
 * the next keystroke. Forever. Both keys picked out here are that bug, caught
 * twice.
 */
export function hydrate(raw: unknown, userId: string): LeadState {
  const base = emptyState(userId);
  if (!raw || typeof raw !== "object") return base;
  const saved = raw as Partial<LeadState>;
  return {
    ...base,
    ...saved,
    userId: base.userId,
    // ONLY the kinds we still have. A plain spread would carry a retired
    // `goodlead` map straight back through `persistable()`. `legacyGoodLeadIds()`
    // reads the raw blob separately so the console can offer to move those
    // churches into a batch before they are dropped.
    mine: { star: { ...saved.mine?.star }, issue: { ...saved.mine?.issue } },
    // DROPPED, NOT CARRIED. The entries in here were written by a stub export
    // button that produced no file — it marked churches as downloaded when
    // nothing had been downloaded. ◎ is the only defence against writing to the
    // same church twice, so it may only ever be folded from a real export log:
    // a mark you can set yourself, or that a dead button left behind, is not
    // evidence. Dropping it on load is also what stops it being re-persisted,
    // which is how the old entries survived every write since.
    lastExportedAt: {},
    // At one user, team === mine. The Blob layer folds other users in here.
    team: base.team,
    config: { ...base.config, ...saved.config },
  };
}

/**
 * The saved blob with the stub export's leftovers removed, or `null` when there
 * was nothing to remove.
 *
 * `hydrate` already drops them, so nothing renders ◎ either way — but until the
 * user happens to change something else there is no write, and a false record of
 * who has been contacted goes on sitting on the disk. "Cleared" should mean
 * cleared.
 *
 * IT COPIES AND DROPS ONE KEY, and it has to. Writing `persistable(hydrate(raw))`
 * back would be shorter and would take `mine.goodlead` with it — the retired ✆
 * marks the console is still offering to move into a batch. That offer reads raw
 * storage, so a broad rewrite would silently answer it "discard" before anybody
 * saw the question.
 */
export function withoutStaleExportLog(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const blob = raw as Record<string, unknown>;
  const log = blob.lastExportedAt;
  if (!log || typeof log !== "object" || Object.keys(log).length === 0) return null;
  const rest = { ...blob };
  delete rest.lastExportedAt;
  return rest;
}

/** The subset that goes to storage. Anything absent here cannot be resurrected. */
export function persistable(s: LeadState) {
  const { userId, mine, lastExportedAt, notes, config } = s;
  return { userId, mine, lastExportedAt, notes, config };
}

/* --------------------------------------------------------------- reducer */

/** Pure, so the Blob backend can reuse it verbatim against a fetched snapshot. */
export function reduce(s: LeadState, m: Mutation, now: number): LeadState {
  switch (m.type) {
    case "mark.toggle": {
      const set = { ...s.mine[m.kind] };
      // Toggle OFF removes the timestamp; toggle ON writes a fresh one, which is
      // what lets a re-mark re-enter the export queue.
      if (set[m.orgId]) delete set[m.orgId];
      else set[m.orgId] = now;
      return { ...s, mine: { ...s.mine, [m.kind]: set } };
    }
    case "note.set": {
      const notes = { ...s.notes };
      if (m.text.trim()) notes[m.orgId] = m.text;
      else delete notes[m.orgId];
      return { ...s, notes };
    }
    case "config.color.set": {
      const colors: ColorOverrides = { ...s.config.colors };
      const forQ = { ...(colors[m.q] ?? {}) };
      if (m.state) forQ[m.answer] = m.state;
      else delete forQ[m.answer];
      if (Object.keys(forQ).length) colors[m.q] = forQ;
      else delete colors[m.q];
      return { ...s, config: { ...s.config, colors } };
    }
    case "config.favor.set":
      return { ...s, config: { ...s.config, favor: m.favor } };
    case "export.commit": {
      // The ONLY writer of lastExportedAt, and it comes from the export result —
      // never from a user action.
      const next = { ...s.lastExportedAt };
      for (const id of m.ids) next[id] = m.at;
      return { ...s, lastExportedAt: next };
    }
  }
}
