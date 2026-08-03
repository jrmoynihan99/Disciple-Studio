"use client";

/**
 * The state layer.
 *
 * ONE interface, two backends: `localStorage` today, R2 later, with no component
 * change. Everything a component touches goes through `getState()` / `mutate()`.
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
 * it never worked: `export.commit` had no dispatcher, so `lastExportedAt` was
 * permanently `{}` and the comparison always reduced to "is it marked". The
 * queue is now a BATCH — `lib/leads/engine/group-types.ts` — which is persistent,
 * server-side and the thing the export actually reads.
 *
 * ◎ IS NO LONGER DORMANT. `ExportDialog` dispatches `export.commit` once the
 * demos exist, so `lastExportedAt` is a real record of who has been written to
 * and it has to survive a page load — which for a while it did not, because the
 * loader still discarded it unconditionally. See `EXPORT_LOG_ERA`.
 */

import type { FavorModel, VerdictState } from "@/lib/leads/engine/types";
// Relative with the extension, not `@/…`: this is a VALUE import, so it survives
// to runtime, and `node --test` resolves no path alias. The type-only import
// above is erased and can keep the alias.
import { TUNING_DEFAULTS } from "../engine/favor.ts";

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
  /**
   * WHICH ERA THE EXPORT LOG ON DISK WAS WRITTEN IN. See `EXPORT_LOG_ERA`.
   *
   * The only versioned thing in this blob, and it earns that: entries written by
   * the old stub button are indistinguishable from real ones by inspection —
   * same shape, same plausible timestamps — so the only way to tell them apart is
   * to record which code wrote them.
   */
  exportLogEra: number;
  notes: Record<OrgId, string>;
  config: TeamConfig;
}

/**
 * Bumped when entries already on disk can no longer be trusted.
 *
 *   0/absent  written by a stub export button that produced no file. It marked
 *             churches as contacted when nothing had been sent, so it is
 *             discarded once, on the first load that sees it.
 *   1         written by `ExportDialog`, after demos were actually generated.
 *
 * THE DISCARD IS NOW A MIGRATION, NOT A POLICY. `hydrate` used to hard-code
 * `lastExportedAt: {}` unconditionally and `withoutStaleExportLog` deleted the
 * key from storage on every load — correct while nothing real wrote it, and
 * quietly fatal the moment something did. The export ends in a full navigation,
 * so the console is always re-entered as a fresh document: every Sent mark ever
 * written was erased before it could be read once. That made three shipped
 * claims false — the rail's Sent counter, the "Sent only" filter, and the badge
 * `LeadRow` calls "the only defence against contacting the same church twice".
 */
export const EXPORT_LOG_ERA = 1;

export type Mutation =
  | { type: "mark.toggle"; kind: MarkKind; orgId: OrgId }
  | { type: "note.set"; orgId: OrgId; text: string }
  | { type: "config.color.set"; q: string; answer: string; state: VerdictState | null }
  | { type: "config.favor.set"; favor: FavorModel | null }
  | { type: "export.commit"; ids: OrgId[]; at: number };

export type RowTint = "issue" | "collecting" | "exported" | "star";

/**
 * Where a row's collect state comes from now — batch membership, not a mark.
 *
 * `sent` JOINED THEM for the same reason `collecting` did. It was read off
 * `lastExportedAt`, a log this module appends to and never removes from, so a
 * row kept its ◎ after the batch that produced it had been deleted — a claim
 * about the world with nothing left behind it. See `wasSent`, which is now the
 * only thing that answers this question, everywhere it is asked.
 */
export interface CollectView {
  collecting: boolean;
  earlier: boolean;
  sent: boolean;
}

const NOT_COLLECTED: CollectView = { collecting: false, earlier: false, sent: false };

/* ------------------------------------------------------------- selectors */

/** The newest mark across every user. */
export function markedAt(s: LeadState, kind: MarkKind, id: OrgId): number {
  return Math.max(s.mine[kind][id] ?? 0, s.team[kind][id] ?? 0);
}

export function isMarked(s: LeadState, kind: MarkKind, id: OrgId): boolean {
  return markedAt(s, kind, id) > 0;
}

/**
 * WHEN a church was sent one, or 0. NOT "whether" — see `wasSent`.
 *
 * The log this reads is append-only and per-device, so it can say a church was
 * written to on Tuesday and cannot say that the record of it has since been
 * deleted. Every surface that draws a conclusion — the counter, the filter, the
 * ◎ badge — now asks the batches instead. This is left for the one thing the
 * batches cannot supply, a per-church timestamp, and for the migration in
 * `EXPORT_LOG_ERA` that has to keep working on logs already on disk.
 */
export function exportedAt(s: LeadState, id: OrgId): number {
  return s.lastExportedAt[id] ?? 0;
}

/**
 * EVERY state the row is in, in precedence order — issue > collecting > exported
 * > star.
 *
 * THE PRECEDENCE STILL DECIDES THE WASH; IT NO LONGER DECIDES WHAT IS VISIBLE.
 *
 * `rowTint` returned one winner, and the wash it named painted the whole row —
 * so a church that was starred AND flagged AND collected looked exactly like one
 * that was only flagged. The marks were not in conflict; the renderer was just
 * picking. A reviewer starring a row that already had an issue saw nothing change
 * and reasonably read the click as lost.
 *
 * So the winner keeps the background — one row, one dominant colour, which is
 * what makes the list skimmable — and the FULL list is what the edge rail draws,
 * one band per state. Amber over red over green stay legible as three bands where
 * three blended washes would have averaged into a muddy brown that means nothing.
 *
 * A church in an EARLIER batch is still in no state at all. It is not part of the
 * current batch; it says so on its own line and sinks to the bottom instead.
 */
export function rowTints(
  s: LeadState,
  id: OrgId,
  collect: CollectView = NOT_COLLECTED,
): RowTint[] {
  const out: RowTint[] = [];
  if (isMarked(s, "issue", id)) out.push("issue");
  if (collect.collecting) out.push("collecting");
  if (collect.sent) out.push("exported");
  if (isMarked(s, "star", id)) out.push("star");
  return out;
}

/**
 * The dominant state, which is what tints the row background.
 *
 * Kept as its own export because it is the thing the audit measures and the
 * precedence tests pin — `rowTints()[0]` by construction, so the two can never
 * disagree about which one wins.
 */
export function rowTint(s: LeadState, id: OrgId, collect: CollectView = NOT_COLLECTED): RowTint | null {
  return rowTints(s, id, collect)[0] ?? null;
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
    exportLogEra: EXPORT_LOG_ERA,
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
    /**
     * CARRIED IF A REAL EXPORT WROTE IT, DROPPED IF THE STUB DID.
     *
     * This was `{}` outright, which was right while the only thing that had ever
     * written the log was a button that produced no file. `ExportDialog` writes
     * it now, after the demos exist — and because the export finishes with a full
     * navigation, an unconditional drop erased every Sent mark before anything
     * could read it. ◎ may only be folded from a real export log; the era marker
     * is what says whether this one is. See `EXPORT_LOG_ERA`.
     */
    lastExportedAt:
      saved.exportLogEra === EXPORT_LOG_ERA ? { ...saved.lastExportedAt } : {},
    exportLogEra: EXPORT_LOG_ERA,
    // At one user, team === mine. The Blob layer folds other users in here.
    team: base.team,
    config: { ...base.config, ...saved.config, favor: hydrateFavor(saved.config?.favor) },
  };
}

/**
 * A stored favor model, with any term added since it was saved filled in.
 *
 * `pathwayPts` is new, so a model saved before it existed carries no key and
 * would score `+undefined || 0` — a silent zero. The symptom is the worst kind:
 * the tuning panel shows a slider at 1, the denominator reads 8.5, and every
 * church still scores as though the pathway were worth nothing, for anyone who
 * had ever opened the panel before today.
 *
 * Filled from `TUNING_DEFAULTS` rather than a literal so there is one place the
 * shipped weights live. Only ABSENT keys are filled — a user who deliberately
 * set it to 0 keeps their 0, because `??` tests for the key, not for falsiness.
 */
function hydrateFavor(saved: FavorModel | null | undefined): FavorModel | null {
  if (!saved) return null;
  return {
    ...saved,
    pathwayPts: saved.pathwayPts ?? TUNING_DEFAULTS.pathwayPts,
    chmsPts: saved.chmsPts ?? TUNING_DEFAULTS.chmsPts,
  };
}

/**
 * The saved blob with the STUB ERA's leftovers removed, or `null` when there is
 * nothing to remove.
 *
 * ONCE, NOT ON EVERY LOAD, and that is the whole change. `hydrate` already
 * ignores a stub-era log, so nothing renders ◎ either way — but until the user
 * happens to change something else there is no write, and a false record of who
 * has been contacted goes on sitting on the disk. "Cleared" should mean cleared.
 *
 * The era check is what makes this a migration instead of a wipe: once a blob
 * carries the current marker, a real export log is on disk and this returns
 * `null` for it forever. Without that check it deleted the key on every single
 * load, which is what kept `lastExportedAt` permanently empty even after
 * something started writing it.
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
  if (blob.exportLogEra === EXPORT_LOG_ERA) return null;
  const log = blob.lastExportedAt;
  if (!log || typeof log !== "object" || Object.keys(log).length === 0) return null;
  const rest = { ...blob };
  delete rest.lastExportedAt;
  return rest;
}

/** The subset that goes to storage. Anything absent here cannot be resurrected. */
export function persistable(s: LeadState) {
  const { userId, mine, lastExportedAt, exportLogEra, notes, config } = s;
  return { userId, mine, lastExportedAt, exportLogEra, notes, config };
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
