/**
 * Paid-staff size tiers. Ported verbatim from `core.js`.
 *
 * Its own module only to break an import cycle: `colorState` needs
 * `staffCountState`, and `favorScore` needs `colorState`.
 *
 * Paid staff is scored by a customizable SIZE DISTRIBUTION: each tier
 * {lo, hi, pts} awards points to a church whose count falls inside it
 * (hi: null = no upper cap). NON-MONOTONIC BY DESIGN — mid-size churches (the
 * sweet spot) earn the most, tiny and mega churches earn nothing:
 *
 *   0-10   0 pts   too small to buy
 *   11-25  1 pt
 *   26-40  2 pts   the sweet spot
 *   41-59  1 pt
 *   60+    0 pts   mega-church, already has a vendor
 *
 * The user can add, remove and re-point tiers at runtime, so nothing here may
 * assume five tiers or a particular shape.
 */

import type { FavorModel, QuestionView, StaffTier, VerdictState } from "./types.ts";

/** The tier a count lands in, or null. */
export function staffTier(count: number | null | undefined, favor: FavorModel): StaffTier | null {
  if (count == null) return null;
  for (const t of favor.staffTiers ?? []) {
    const lo = +t.lo || 0;
    const hi = t.hi == null ? Infinity : +t.hi;
    if (count >= lo && count <= hi) return t;
  }
  return null;
}

/** Points a church's staff count earns. Only a `counted` answer scores. */
export function staffPts(q2: QuestionView | null | undefined, favor: FavorModel): number {
  const c = q2 && q2.answer === "counted" ? (q2.count ?? null) : null;
  const t = staffTier(c, favor);
  return t ? +t.pts || 0 : 0;
}

/** The highest points any tier awards — the staff term of the favor ceiling. */
export function staffMaxPts(favor: FavorModel): number {
  let m = 0;
  for (const t of favor.staffTiers ?? []) m = Math.max(m, +t.pts || 0);
  return m;
}

/**
 * The colour a staff count paints: top-tier points -> good, any points -> good2,
 * none -> WARN.
 *
 * Not red. Red is reserved for the issue flag; a size mismatch is not an error.
 */
export function staffCountState(count: number | null | undefined, favor: FavorModel): VerdictState {
  const t = staffTier(count, favor);
  if (!t) return "warn";
  const p = +t.pts || 0;
  const m = staffMaxPts(favor);
  return p <= 0 ? "warn" : m > 0 && p >= m ? "good" : "good2";
}

/**
 * How a paid-staff count RENDERS. One helper, so the list tile, the dossier, the
 * facet and any export cannot drift apart.
 *
 *   27   a cited count — titles verified verbatim on the staff page
 *   12+  a cited FLOOR — the page does not enumerate everyone; the real number is >= 12
 *   12?  an uncited estimate — we counted rows; no title was verified
 *
 * "7" and "7+" are DIFFERENT ANSWERS. Filtering to "7" must not hand back
 * churches we only know have seven or more.
 */
export function staffText(q2: QuestionView | null | undefined): string {
  if (!q2 || q2.count == null) return "—";
  if (q2.count_is_floor) return `${q2.count}+`;
  if (q2.count_is_uncited) return `${q2.count}?`;
  return String(q2.count);
}

/**
 * Parse a facet option back to a number. Option VALUES are strings, and "7+"
 * becomes NaN under a bare `+v` coercion.
 */
export function staffNum(v: string): number {
  const n = parseInt(v, 10);
  return isNaN(n) ? -1 : n;
}
