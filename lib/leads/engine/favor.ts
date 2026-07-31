/**
 * The favor engine. Ported verbatim from `core.js`.
 *
 * Favor is how good a Disciple Studio lead a church is. EVERY input is a knob
 * the user turns at runtime, so it is *the user's own model applied in their
 * browser* — never a verdict the pipeline reached. That distinction is the whole
 * reason the pipeline is allowed to ship it: the pipeline records facts and
 * citations, and the human predicts fit.
 *
 * Scored over the FIVE crucial fields ONLY: paid-staff size (q2), custom login
 * (q5), independent website (q7), native app (q8), and each present next-step
 * category. Everything else — q1, q4, q6, q9, q10 — is displayed and filterable
 * but does not score.
 */

import type { ChurchView } from "./adapt.ts";
import type { EngineCtx, FavorModel, VerdictState } from "./types.ts";
import { VOCAB } from "./vocab.generated.ts";
import { colorState } from "./color.ts";
import { staffMaxPts, staffPts } from "./staff.ts";

export const STEP_CATS = VOCAB.STEP_CATS;

/**
 * The REFERENCE model — core.js's own defaults, generated from the fixture.
 *
 * This is not what the console ships. It exists so the golden table stays
 * checkable: `golden-colors.json` was produced by executing core.js under these
 * exact numbers, so re-tuning the product must never move it. Every engine test
 * pins this; only the app reads `defaultFavorModel()`.
 */
export const FAVOR_DEFAULTS = VOCAB.FAVOR_DEFAULTS;

/**
 * The model the console STARTS on — the owner's tuning, not core.js's.
 *
 * Two things differ from the reference, and both are judgements about who buys,
 * not facts the pipeline measured:
 *
 *   · Small churches score NEGATIVE. The reference gave 0-10 staff zero points,
 *     which ranks a five-person plant level with a church we know nothing about.
 *     -2 and -1 push them below the unknowns, where they belong in a call list.
 *   · Large churches keep the full 2. The reference decayed 41-59 to 1 and 60+
 *     to 0 on the theory that mega-churches already have a vendor; that is a
 *     guess, and a wrong one often enough to cost leads.
 *   · Custom login is worth 6x what it was (0.5 -> 3). It is the single
 *     strongest signal in the set — it is the thing being sold.
 *
 * Anyone can move all of it at runtime in the tuning panel; this is only where
 * the sliders sit before they touch them.
 */
export const TUNING_DEFAULTS: FavorModel = {
  staffTiers: [
    { lo: 0, hi: 4, pts: -2 },
    { lo: 5, hi: 9, pts: -1 },
    { lo: 10, hi: 10, pts: 0 },
    { lo: 11, hi: 25, pts: 1 },
    { lo: 26, hi: 40, pts: 2 },
    { lo: 41, hi: 59, pts: 2 },
    { lo: 60, hi: null, pts: 2 },
  ],
  loginPts: 3,
  websitePts: FAVOR_DEFAULTS.websitePts,
  appPts: FAVOR_DEFAULTS.appPts,
  stepCat: FAVOR_DEFAULTS.stepCat,
};

/** Deep clone, so nothing shares a mutable tier object with the constant. */
function clone(m: FavorModel): FavorModel {
  return {
    staffTiers: m.staffTiers.map((t) => ({ lo: t.lo, hi: t.hi, pts: t.pts })),
    loginPts: m.loginPts,
    websitePts: m.websitePts,
    appPts: m.appPts,
    stepCat: { ...m.stepCat },
  };
}

/** What the app starts on, and what "reset to defaults" returns to. */
export function defaultFavorModel(): FavorModel {
  return clone(TUNING_DEFAULTS);
}

/** What the golden table was generated under. Tests only. */
export function referenceFavorModel(): FavorModel {
  return {
    staffTiers: FAVOR_DEFAULTS.staffTiers.map((t) => ({ lo: t.lo, hi: t.hi, pts: t.pts })),
    loginPts: FAVOR_DEFAULTS.loginPts,
    websitePts: FAVOR_DEFAULTS.websitePts,
    appPts: FAVOR_DEFAULTS.appPts,
    stepCat: { ...FAVOR_DEFAULTS.stepCat },
  };
}

function stepCatSum(favor: FavorModel): number {
  const sc = favor.stepCat ?? {};
  let s = 0;
  for (const [k] of STEP_CATS) s += +sc[k] || 0;
  return s;
}

/**
 * Per-present-category points.
 *
 * UNLOOKED PAGES CONTRIBUTE NOTHING — this returns 0 when `looked` is false. It
 * does not return a partial score, and it does not treat unlooked as absent.
 */
function stepsPts(view: ChurchView, favor: FavorModel): number {
  const s = view.steps;
  if (!s.looked) return 0;
  const sc = favor.stepCat ?? {};
  let n = 0;
  for (const c of s.present) n += +sc[c.key] || 0;
  return n;
}

/** Fraction of categories present, or null when we never looked. */
function stepsFrac(view: ChurchView): number | null {
  const s = view.steps;
  if (!s.looked || !s.nCats) return null;
  return s.nPresent / s.nCats;
}

/**
 * Fractional and weighted. Drives the sort, the chip and the histogram.
 *
 * `good2 -> half weight` is the only place a "likely" answer earns partial
 * credit, and it applies to exactly q5/q7/q8.
 */
export function favorScore(view: ChurchView, ctx: EngineCtx): number {
  const M = ctx.favor;
  let n = 0;
  n += staffPts(view.q("q2"), M);
  const weighted: [("q5" | "q7" | "q8"), number][] = [
    ["q5", +M.loginPts || 0],
    ["q7", +M.websitePts || 0],
    ["q8", +M.appPts || 0],
  ];
  for (const [k, w] of weighted) {
    const s = colorState(k, view.q(k), ctx);
    if (s === "good") n += w;
    else if (s === "good2") n += w / 2;
  }
  n += stepsPts(view, M);
  return n;
}

/**
 * An INTEGER count of favorable signals. Drives the "opportunities only" filter
 * — a church with 0 is hidden.
 *
 * Note the asymmetry with `favorScore`: this counts, that weights, and no
 * halves are awarded here. Do not derive one from the other.
 */
export function favorCount(view: ChurchView, ctx: EngineCtx): number {
  let n = 0;
  if (staffPts(view.q("q2"), ctx.favor) > 0) n++;
  for (const k of ["q5", "q7", "q8"] as const) {
    const s = colorState(k, view.q(k), ctx);
    if (s === "good" || s === "good2") n++;
  }
  const f = stepsFrac(view);
  if (f != null && f >= 0.5) n++;
  return n;
}

/**
 * The TRUE ceiling — sets the histogram axis.
 * Reference model: 6.5. Shipped tuning: 9.
 */
export function favorMax(favor: FavorModel): number {
  return (
    staffMaxPts(favor) +
    (+favor.loginPts || 0) +
    (+favor.websitePts || 0) +
    (+favor.appPts || 0) +
    stepCatSum(favor)
  );
}

/**
 * The reference denominator shown in the chip ("3.2 / 7.5") — the most a church
 * can score WITHOUT the custom-website and app opportunities.
 * Reference model: 5. Shipped tuning: 7.5.
 *
 * SO A CHURCH CAN LEGITIMATELY SCORE ABOVE ITS OWN DENOMINATOR. `8 / 7.5` is not
 * a bug; it is a church that also lacks a custom site and an app. Do not clamp
 * it, and do not render it as a percentage bar that visually maxes out — capping
 * it at 100% breaks the meaning of the chip.
 *
 * It can also go BELOW ZERO now that the small-church tiers are negative. A
 * church of three staff reading `-2 / 7.5` is the model working, not a bug —
 * the floor is `Math.max(0.5, ...)` on the DENOMINATOR only, never on the score.
 */
export function favorBase(favor: FavorModel): number {
  return Math.max(
    0.5,
    staffMaxPts(favor) + (+favor.loginPts || 0) + stepCatSum(favor),
  );
}

/** Round to 2 decimals and drop float noise: "5.140000001" -> "5.14". */
export function favFmt(x: number): string {
  return String(Math.round((+x || 0) * 100) / 100);
}

/** The histogram bucket a score falls in, clamped to the axis. */
export function favorBucket(score: number, favor: FavorModel): number {
  const max = Math.max(1, Math.ceil(favorMax(favor)));
  return Math.min(max, Math.max(0, Math.round(score)));
}

/** The four questions the opportunity phrasing keys off. */
export const FAVOR_KEYS = ["q2", "q5", "q7", "q8"] as const;

/** Re-exported so callers need not reach past the barrel. */
export type { VerdictState };
