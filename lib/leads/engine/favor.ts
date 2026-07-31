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
export const FAVOR_DEFAULTS = VOCAB.FAVOR_DEFAULTS;

/** A fresh, deeply-cloned default model — nothing shares mutable tier objects. */
export function defaultFavorModel(): FavorModel {
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
 * In the fixture: 6.5.
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
 * The reference denominator shown in the chip ("3.2 / 5") — the most a church
 * can score WITHOUT the custom-website and app opportunities.
 * In the fixture: 5.
 *
 * SO A CHURCH CAN LEGITIMATELY SCORE ABOVE ITS OWN DENOMINATOR. `4.8 / 5` is not
 * a bug; it is a church that also lacks a custom site and an app. Do not clamp
 * it, and do not render it as a percentage bar that visually maxes out — capping
 * it at 100% breaks the meaning of the chip.
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
