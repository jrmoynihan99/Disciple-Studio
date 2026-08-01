/**
 * Paid-staff size tiers. Ported verbatim from `core.js`.
 *
 * Its own module only to break an import cycle: `colorState` needs
 * `staffCountState`, and `favorScore` needs `colorState`.
 *
 * Paid staff is scored by a customizable SIZE DISTRIBUTION: each tier
 * {lo, hi, pts} awards points to a church whose count falls inside it
 * (hi: null = no upper cap). core.js's own distribution was non-monotonic —
 * mid-size churches earned the most, tiny and mega churches nothing:
 *
 *   0-10   0 pts   too small to buy
 *   11-25  1 pt
 *   26-40  2 pts   the sweet spot
 *   41-59  1 pt
 *   60+    0 pts   mega-church, already has a vendor
 *
 * The SHIPPED tuning (`TUNING_DEFAULTS` in favor.ts) is a different shape: seven
 * bands, negative below ten, flat 2 above twenty-five. Points may therefore be
 * NEGATIVE, and `staffPts` may return a negative number — which is the point,
 * since a church we know is tiny should rank below one we never measured.
 *
 * The user can add, remove and re-point tiers at runtime, so nothing here may
 * assume five tiers, seven tiers, or a particular shape.
 */

import type {
  FavorModel,
  QuestionView,
  StaffClaim,
  StaffTier,
  VerdictState,
} from "./types.ts";

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
 * Not red. Red is reserved for the issue flag; a size mismatch is not an error —
 * and that holds for the negative bands too. A three-person church costs you
 * favor points, but "too small for us" is a fact about our product, not a defect
 * in the church, and colouring it red would say the second thing.
 */
export function staffCountState(count: number | null | undefined, favor: FavorModel): VerdictState {
  const t = staffTier(count, favor);
  if (!t) return "warn";
  const p = +t.pts || 0;
  const m = staffMaxPts(favor);
  return p <= 0 ? "warn" : m > 0 && p >= m ? "good" : "good2";
}

/**
 * The STRENGTH of a paid-staff count. ONE VALUE, NOT TWO BOOLEANS.
 *
 * `count_is_floor` + `count_is_uncited` is wrong in a way that hides itself: the
 * two are not siblings. `floor_uncited` IS a floor, so both flags fire together,
 * and any renderer must then pick one — floor won, and the uncited form rendered
 * for nobody at all. The upstream pipeline hit the identical bug from its own
 * side (12 of 100 churches, both flags set, the second unobservable downstream)
 * and collapsed them into this enum. We follow it rather than invent a third
 * spelling of the same fact.
 *
 * Declared in `types.ts` and re-exported here so callers can reach it beside the
 * functions that use it, without `types.ts` importing this module.
 */
export type { StaffClaim } from "./types.ts";

/**
 * The claim a q2 answer is making, however the publish spelled it.
 *
 * The enum wins when present; the booleans are the fallback so a publish made
 * before the change keeps rendering correctly rather than silently downgrading
 * every floor to an exact count.
 */
export function staffClaim(q2: QuestionView | null | undefined): StaffClaim {
  if (q2?.count_claim) return q2.count_claim;

  // BOTH FLAGS FIRST. `floor_uncited` is a floor, so a naive floor-then-uncited
  // ladder swallows it — that is the original bug, from the inside.
  if (q2?.count_is_floor && q2?.count_is_uncited) return "floor_uncited";
  if (q2?.count_is_floor) return "floor";
  // Uncited ALONE is not a floor. It is the weaker legacy claim: rows counted,
  // no title verified. Mapping it to `floor_uncited` would invent an "at least".
  if (q2?.count_is_uncited) return "uncited";
  return "exact";
}

/**
 * How a paid-staff count RENDERS. One helper, so the list tile, the dossier, the
 * facet and any export cannot drift apart.
 *
 *   27    exact          titles verified verbatim on the staff page
 *   12+   floor          some titles were not found; the real number is >= 12
 *   12+?  floor_uncited  every title WAS found, but the page lists more people
 *                        than distinct titles (two "Pastor" rows are one title).
 *                        The citations prove the ROLES, not the HEADCOUNT.
 *   12?   uncited        LEGACY — rows counted, no title verified at all.
 *
 * A FORM PER CLAIM, AND NO TWO ALIKE. "7" and "7+" are different answers —
 * filtering to "7" must not hand back churches we only know have seven or more —
 * and "12+", "12+?" and "12?" are three more: unsure how many people; sure about
 * the roles and unsure they map one-to-one onto people; and sure about neither.
 */
export function staffText(q2: QuestionView | null | undefined): string {
  if (!q2 || q2.count == null) return "—";
  switch (staffClaim(q2)) {
    case "floor":
      return `${q2.count}+`;
    case "floor_uncited":
      return `${q2.count}+?`;
    case "uncited":
      return `${q2.count}?`;
    default:
      return String(q2.count);
  }
}

/**
 * The same fact in a sentence, for the dossier's finding line.
 *
 * Exists because the dossier used to build this phrase itself from
 * `count_is_floor`, which meant two places knew the rule and only one of them
 * learned about the third claim.
 */
export function staffPhrase(q2: QuestionView | null | undefined): string {
  // `answer === "counted"` as well as a non-null count: a count attached to any
  // other answer is not a claim the pipeline stands behind, and "Not counted" is
  // the honest line for it.
  if (!q2 || q2.answer !== "counted" || q2.count == null) return "Not counted";
  switch (staffClaim(q2)) {
    case "floor":
      return `${staffText(q2)} paid staff (at least)`;
    case "floor_uncited":
      return `${staffText(q2)} paid roles (headcount unproven)`;
    case "uncited":
      return `${staffText(q2)} paid staff (no titles verified)`;
    default:
      return `${q2.count} paid staff (est.)`;
  }
}

/**
 * Parse a facet option back to a number. Option VALUES are strings, and "7+"
 * becomes NaN under a bare `+v` coercion.
 */
export function staffNum(v: string): number {
  const n = parseInt(v, 10);
  return isNaN(n) ? -1 : n;
}
