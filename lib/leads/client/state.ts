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
 *     pending(org)    = marked_at(org) > (lastExportedAt[org] ?? 0)
 *     downloaded(org) = org in lastExportedAt
 *
 * Consequences, all free: nobody ever writes to another user's blob; export
 * mutates no marks at all; re-marking an already-exported church to send it
 * again next batch just works, because a newer `marked_at` beats the last export
 * timestamp. A naive delete-on-export would break that, and it is a real action.
 */

import type { FavorModel, VerdictState } from "@/lib/leads/engine/types";

export type OrgId = string;
export type MarkKind = "star" | "issue" | "goodlead";

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

export type RowTint = "issue" | "goodlead" | "exported" | "star";

/* ------------------------------------------------------------- selectors */

/** The newest mark across every user. */
export function markedAt(s: LeadState, kind: MarkKind, id: OrgId): number {
  return Math.max(s.mine[kind][id] ?? 0, s.team[kind][id] ?? 0);
}

export function isMarked(s: LeadState, kind: MarkKind, id: OrgId): boolean {
  return markedAt(s, kind, id) > 0;
}

/** In the export queue: marked more recently than it was last exported. */
export function isPending(s: LeadState, id: OrgId): boolean {
  return markedAt(s, "goodlead", id) > (s.lastExportedAt[id] ?? 0);
}

export function isDownloaded(s: LeadState, id: OrgId): boolean {
  return id in s.lastExportedAt;
}

/** What the export sends — the good-lead set, NEVER the filtered view. */
export function pendingIds(s: LeadState): OrgId[] {
  const ids = new Set<OrgId>([
    ...Object.keys(s.mine.goodlead),
    ...Object.keys(s.team.goodlead),
  ]);
  return [...ids].filter((id) => isPending(s, id)).sort();
}

/**
 * issue > goodlead > exported > star.
 *
 * Good lead outranks exported ON PURPOSE. Normally they are exclusive, but
 * re-marking an already-exported church is a real action, and if `exported` won,
 * that click would produce no visible change and read as a dead button.
 */
export function rowTint(s: LeadState, id: OrgId): RowTint | null {
  if (isMarked(s, "issue", id)) return "issue";
  if (isPending(s, id)) return "goodlead";
  if (isDownloaded(s, id)) return "exported";
  if (isMarked(s, "star", id)) return "star";
  return null;
}

export function countMarked(s: LeadState, kind: MarkKind): number {
  const ids = new Set([...Object.keys(s.mine[kind]), ...Object.keys(s.team[kind])]);
  if (kind === "goodlead") return [...ids].filter((id) => isPending(s, id)).length;
  return ids.size;
}

export function emptyState(userId: string): LeadState {
  return {
    userId,
    mine: { star: {}, issue: {}, goodlead: {} },
    team: { star: {}, issue: {}, goodlead: {} },
    lastExportedAt: {},
    notes: {},
    config: { colors: {}, favor: null },
  };
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
