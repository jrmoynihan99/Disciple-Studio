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
import { backendIsKind } from "./backend.ts";

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
 *   · A published discipleship pathway is worth 1, and already running a ChMS is
 *     worth another — neither of which core.js had any concept of. Together they
 *     take the shipped denominator from 7.5 to 9.5.
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
  pathwayPts: 1,
  chmsPts: 1,
};

/** Deep clone, so nothing shares a mutable tier object with the constant. */
function clone(m: FavorModel): FavorModel {
  return {
    staffTiers: m.staffTiers.map((t) => ({ lo: t.lo, hi: t.hi, pts: t.pts })),
    loginPts: m.loginPts,
    websitePts: m.websitePts,
    appPts: m.appPts,
    stepCat: { ...m.stepCat },
    pathwayPts: m.pathwayPts,
    chmsPts: m.chmsPts,
  };
}

/**
 * Points for the discipleship pathway.
 *
 * BINARY, and only for a pathway we actually found. `none` and `unknown` score
 * the same zero — deliberately, because the alternative is docking a church for
 * an absence we never measured, and two thirds of the corpus is in that state.
 * The colour already tells those two apart; the score has no business guessing.
 */
function pathwayPts(view: ChurchView, favor: FavorModel): number {
  return view.pathway === "has" ? +(favor.pathwayPts ?? 0) : 0;
}

/**
 * Points for already running a church management system.
 *
 * ChMS ONLY. `backendIsKind(_, "chms")` is the same test the ChMS facet uses, so
 * a church that scores here is exactly a church that filter returns — and the
 * giving processors and media libraries in the other facet score nothing, which
 * is the whole reason `pf` had to be split before it could be scored at all.
 *
 * Churches with no backend detected score zero rather than negative: 1,359 carry
 * no platform key, and that is our detection gap as much as their stack.
 */
function chmsPts(view: ChurchView, favor: FavorModel): number {
  return backendIsKind(view.backend, "chms") ? +(favor.chmsPts ?? 0) : 0;
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
    // EXPLICITLY ZERO. core.js has no discipleship term, so the golden table was
    // generated without one; anything else here moves all 15,274 favor values in
    // the M0 gate and it stops being evidence about the port rather than about
    // the product's current opinion. Stated rather than left undefined so that
    // reading this function tells you it was a decision.
    pathwayPts: 0,
    chmsPts: 0,
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
  n += pathwayPts(view, M);
  n += chmsPts(view, M);
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
 * Reference model: 6.5. Shipped tuning: 11.
 */
export function favorMax(favor: FavorModel): number {
  return (
    staffMaxPts(favor) +
    (+favor.loginPts || 0) +
    (+favor.websitePts || 0) +
    (+favor.appPts || 0) +
    stepCatSum(favor) +
    (+(favor.pathwayPts ?? 0)) +
    (+(favor.chmsPts ?? 0))
  );
}

/**
 * The reference denominator shown in the chip ("3.2 / 9.5") — the most a church
 * can score WITHOUT the custom-website and app opportunities.
 * Reference model: 5. Shipped tuning: 9.5.
 *
 * The discipleship point is IN here, unlike the website and app points, because
 * this denominator excludes exactly the two OPPORTUNITY signals — the things a
 * church earns by lacking something. A published pathway is not an opportunity;
 * it is a church already doing the thing, so it belongs with staff and login.
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
    staffMaxPts(favor) +
      (+favor.loginPts || 0) +
      stepCatSum(favor) +
      (+(favor.pathwayPts ?? 0)) +
      (+(favor.chmsPts ?? 0)),
  );
}

/** Round to 2 decimals and drop float noise: "5.140000001" -> "5.14". */
export function favFmt(x: number): string {
  return String(Math.round((+x || 0) * 100) / 100);
}

/**
 * The histogram bucket a score falls in, clamped to the axis.
 *
 * FLOOR, NOT ROUND. A bar labelled 9 now means "scored at least 9", which is
 * what a reader assumes a bucket labelled with a number means. Rounding put a
 * church on 8.6 into the 9 bar, so the strongest bar included churches that had
 * not reached it — and with the shipped tuning topping out at 9.5 it also
 * created a 10 bar that only 9.5-scorers could ever occupy.
 */
export function favorBucket(score: number, axisMax: number): number {
  return Math.min(Math.max(1, axisMax), Math.max(0, Math.floor(score)));
}

/**
 * THE AXIS THE HISTOGRAM DRAWS — how high the DATA reaches, not how high the
 * model could theoretically go.
 *
 * `favorMax` is the ceiling of the tuning: every knob at once, on a church that
 * has everything. With the shipped weights that is 11, and no church comes near
 * it — so the histogram drew empty bars at 10 and 11 forever, which reads as
 * "there are leads up there we are not seeing" rather than "nobody scores that".
 *
 * So the axis is the best score any church ACTUALLY has, floored. Today that is
 * 9.5 → 9. It is not a cap: raise a weight or publish a stronger church and the
 * axis grows on its own, up to the model's real ceiling.
 *
 * COMPUTED OVER EVERY CHURCH, never the filtered set. The bars must not rescale
 * while somebody is filtering — a histogram whose axis moves as you narrow makes
 * filtering feel like the data is changing underneath you.
 */
export function favorAxisMax(views: readonly ChurchView[], ctx: EngineCtx): number {
  let hi = 0;
  for (const v of views) {
    const s = favorScore(v, ctx);
    if (s > hi) hi = s;
  }
  return Math.max(1, Math.min(Math.floor(hi), Math.ceil(favorMax(ctx.favor))));
}

/** The four questions the opportunity phrasing keys off. */
export const FAVOR_KEYS = ["q2", "q5", "q7", "q8"] as const;

/** Re-exported so callers need not reach past the barrel. */
export type { VerdictState };
