/**
 * The filter engine. Ported from `core.js`.
 *
 * `baseFiltered` applies everything EXCEPT the histogram bucket, so the summary
 * can still show and count every bucket while one is selected; `computeView`
 * then applies the bucket and the sort. That split is why clicking a bar filters
 * without making the other bars vanish.
 */

import type { ChurchView } from "./adapt.ts";
import type { EngineCtx, QuestionKey, VerdictState } from "./types.ts";
import { colorState } from "./color.ts";
import { favorAxisMax, favorBucket, favorCount, favorScore } from "./favor.ts";
import { staffText } from "./staff.ts";
import { stepsCountState } from "./steps.ts";
import { PLATFORM_FACETS } from "./platform.ts";
import { backendIsKind } from "./backend.ts";
import { PATHWAY_STATE, type PathwayKnowledge } from "./group-types.ts";

export type SortKey = "opp" | "steps" | "name" | "paid" | "state" | "scraped";

/**
 * `collected` replaced `goodlead`. It is answered by batch membership rather
 * than by a mark, because the mark's "queue" was never real — nothing wrote the
 * export log, so it only ever meant "is it marked".
 */
export type MarkFilter = "star" | "issue" | "collected" | "exported";

export interface LeadFilters {
  /** Name only — not city, not quote text. */
  q: string;
  pmin: number | null;
  pmax: number | null;
  opponly: boolean;
  sort: SortKey;
  country: string;
  subdiv: string;
  network: string;
  marks: Record<MarkFilter, boolean>;
  favorBucket: number | null;
  /** facet key -> accepted values. Empty/absent means "any". */
  qsel: Record<string, string[]>;
  /**
   * Sink churches already collected in an EARLIER batch to the bottom.
   *
   * The daily job is finding the best twenty NEW churches, so the ones already
   * handled should stop competing for attention. They are never hidden — a gap
   * in what you see must never be silent — only sorted last, and the count is
   * reported in the deck.
   */
  newFirst: boolean;
}

export function defaultFilters(): LeadFilters {
  return {
    q: "",
    pmin: null,
    pmax: null,
    opponly: false,
    sort: "opp",
    country: "",
    subdiv: "",
    network: "",
    marks: { star: false, issue: false, collected: false, exported: false },
    favorBucket: null,
    qsel: {},
    newFirst: true,
  };
}

export function anyFilterActive(f: LeadFilters): boolean {
  return !!(
    f.q ||
    f.pmin != null ||
    f.pmax != null ||
    f.opponly ||
    f.country ||
    f.subdiv ||
    f.network ||
    f.favorBucket != null ||
    Object.values(f.marks).some(Boolean) ||
    Object.values(f.qsel).some((v) => v && v.length)
  );
}

/** Tells the filter which churches carry which marks. Supplied by the state layer. */
export type MarkLookup = (kind: MarkFilter, orgId: string) => boolean;

const NO_MARKS: MarkLookup = () => false;

/**
 * The value a church presents for a facet.
 *
 * q2's facet options are the distinct paid-staff COUNTS (its answer is just
 * "counted"), and a FLOOR MUST NOT SHARE A BUCKET WITH AN EXACT COUNT —
 * filtering to "7" should not hand back churches we only know have seven or
 * more.
 */
export function facetVal(key: string, view: ChurchView): string {
  if (key.endsWith("_platform")) {
    const qk = key.slice(0, -"_platform".length) as QuestionKey;
    return view.q(qk)?.platform_key ?? "";
  }
  // Language is a recorded fact, not an answer to one of the questions.
  if (key === "lang") return view.lang;

  /**
   * TWO FACETS OVER ONE FIELD. A church running Tithe.ly appears under both,
   * because Tithe.ly sells both halves — see `BACKEND_KINDS`. Returning "" here
   * is what keeps it out of the other list rather than a filter that has to know
   * about vendors.
   */
  if (key === "chms") return backendIsKind(view.backend, "chms") ? view.backend : "";
  if (key === "tooling") return backendIsKind(view.backend, "tooling") ? view.backend : "";

  /**
   * The three discipleship states, not the step count.
   *
   * A count facet would offer 2..10 and silently drop the distinction the whole
   * feature turns on — "no pathway" and "never checked" would both land outside
   * every numeric option, so filtering to any count would hide two thirds of the
   * corpus without saying so.
   */
  if (key === "pathway") return view.pathway;
  if (key === "q2") {
    const q2 = view.q("q2");
    return q2?.answer === "counted" && q2.count != null ? staffText(q2) : "";
  }
  if (key === "steps") return view.steps.looked ? String(view.steps.nPresent) : "";
  return view.q(key as QuestionKey)?.answer ?? "";
}

export interface OptionState {
  state: VerdictState | "";
  mixed: boolean;
}

const NO_SWATCH: OptionState = { state: "", mixed: false };

/** The value-independent answers, so both entry points agree by construction. */
function fixedOptionState(key: string, value: string): OptionState | null {
  // A platform is a fact, not a verdict — no swatch. The two backend facets are
  // the same kind of thing: "runs Breeze" is not good or bad, it is true.
  if (key.endsWith("_platform") || key === "lang" || key === "chms" || key === "tooling") {
    return NO_SWATCH;
  }
  if (key === "steps") return { state: stepsCountState(Number(value) || 0), mixed: false };
  // The discipleship states carry the same colours the tile does, from one map.
  if (key === "pathway") {
    return { state: PATHWAY_STATE[value as PathwayKnowledge] ?? "", mixed: false };
  }
  return null;
}

/** The dominant colour in a tally, and whether the option is not unanimous. */
function dominant(tally: Map<VerdictState, number>): OptionState {
  let best: VerdictState | "" = "";
  let n = -1;
  for (const [s, c] of tally) {
    if (c > n) {
      best = s;
      n = c;
    }
  }
  // Two churches with the same answer can render different colours where the
  // colour is computed rather than looked up. Report the dominant one and say
  // it is mixed, rather than letting a sample of one speak for all.
  return { state: best, mixed: tally.size > 1 };
}

/**
 * EVERY OPTION OF ONE FACET, IN ONE PASS — not one pass per option.
 *
 * `optionState` walks all 15,273 churches to answer for a single value, and the
 * rail called it once per shown option. The staff facet yields 137 options, so
 * expanding it cost 137 full scans — measured at 463ms per Rail render — and
 * `Rail` is not memoised, so that ran again on every keystroke in the search
 * box. Same answers, one scan.
 */
export function optionStates(
  key: string,
  views: readonly ChurchView[],
  ctx: EngineCtx,
): Map<string, OptionState> {
  const out = new Map<string, OptionState>();
  // A facet whose colour is a function of the VALUE needs no scan at all —
  // `optionStateFrom` answers those from `fixedOptionState` per option, which is
  // also why they are not enumerated here (`steps` is any integer).
  if (fixedOptionState(key, "")) return out;

  const qk = key as QuestionKey;
  const byValue = new Map<string, Map<VerdictState, number>>();
  for (const v of views) {
    const value = facetVal(key, v);
    if (!value) continue;
    let tally = byValue.get(value);
    if (!tally) byValue.set(value, (tally = new Map()));
    const s = colorState(qk, v.q(qk), ctx);
    tally.set(s, (tally.get(s) ?? 0) + 1);
  }
  for (const [value, tally] of byValue) out.set(value, dominant(tally));
  return out;
}

/**
 * One option's answer, given the map `optionStates` built.
 *
 * The value-independent facets are answered here rather than being pre-filled,
 * because their option lists are open-ended (`steps` is any integer) and there
 * is nothing to enumerate.
 */
export function optionStateFrom(
  states: Map<string, OptionState>,
  key: string,
  value: string,
): OptionState {
  return fixedOptionState(key, value) ?? states.get(value) ?? NO_SWATCH;
}

/** The colour a facet OPTION paints, so the swatch can never disagree with the cell. */
export function optionState(
  key: string,
  value: string,
  views: readonly ChurchView[],
  ctx: EngineCtx,
): OptionState {
  const fixed = fixedOptionState(key, value);
  if (fixed) return fixed;

  const qk = key as QuestionKey;
  const tally = new Map<VerdictState, number>();
  for (const v of views) {
    if (facetVal(key, v) !== value) continue;
    const s = colorState(qk, v.q(qk), ctx);
    tally.set(s, (tally.get(s) ?? 0) + 1);
  }
  return dominant(tally);
}

/** How many churches sit in each option of a facet, over the currently-narrowed set. */
export function facetCounts(key: string, views: readonly ChurchView[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of views) {
    const val = facetVal(key, v);
    if (!val) continue;
    m.set(val, (m.get(val) ?? 0) + 1);
  }
  return m;
}

/**
 * Which options a facet should actually offer.
 *
 * AN OPTION THAT WOULD RETURN NOTHING IS NOT OFFERED. The value list is built
 * from the whole corpus, so at 15,274 churches a facet like Language listed 32
 * options of which most read `0` under any real filter — a wall of choices that
 * all lead to an empty list.
 *
 * A SELECTED OPTION IS ALWAYS OFFERED, whatever its count, and that exception is
 * the whole reason this is a function rather than a `.filter()` at the call site.
 * A facet with a selection is counted against the set narrowed by the OTHER
 * facets, so its own ticked option can legitimately reach 0 — tick Language `es`,
 * then a country with no Spanish-speaking church. Dropping it would leave a
 * filter that is active, invisible, and impossible to untick: the list stays
 * empty and nothing on screen says which control emptied it.
 *
 * Order is preserved, because the caller sorted it for a reason.
 */
export function visibleFacetValues(
  values: readonly string[],
  counts: ReadonlyMap<string, number>,
  selected: readonly string[],
): string[] {
  return values.filter((v) => (counts.get(v) ?? 0) > 0 || selected.includes(v));
}

/**
 * Everything except the histogram bucket.
 *
 * Facets are OR within a facet, AND across facets — which is what a person means
 * by "Wix or Squarespace, and no app".
 */
export function baseFiltered(
  views: readonly ChurchView[],
  f: LeadFilters,
  ctx: EngineCtx,
  isMarked: MarkLookup = NO_MARKS,
): ChurchView[] {
  const term = f.q.trim().toLowerCase();

  return views.filter((v) => {
    if (term && !v.name.toLowerCase().includes(term)) return false;
    if (f.opponly && favorCount(v, ctx) === 0) return false;

    for (const kind of ["star", "issue", "collected", "exported"] as const) {
      if (f.marks[kind] && !isMarked(kind, v.id)) return false;
    }

    if (f.country && v.country !== f.country) return false;
    if (f.subdiv && v.subdiv !== f.subdiv) return false;
    if (f.network && v.network !== f.network) return false;

    // A range filter, separate from the scoring tiers. A church with no count is
    // excluded when a range is set — we cannot claim it falls inside one.
    if (f.pmin != null || f.pmax != null) {
      const c = v.q("q2")?.count;
      if (c == null) return false;
      if (f.pmin != null && c < f.pmin) return false;
      if (f.pmax != null && c > f.pmax) return false;
    }

    for (const key in f.qsel) {
      const sel = f.qsel[key];
      if (!sel || !sel.length) continue;
      if (!sel.includes(facetVal(key, v))) return false;
    }

    return true;
  });
}

export interface Summary {
  n: number;
  total: number;
  /** One entry per integer favor bucket, over the FULL dataset's axis. */
  dist: number[];
  /** How many of `n` were already collected in an earlier batch. Reported, never hidden. */
  collected: number;
  /**
   * HOW MANY CHURCHES A REGION FILTER IS EXCLUDING FOR HAVING NO REGION AT ALL —
   * `0` when no region filter is set.
   *
   * The distinction this exists for is between "did not match" and "we never
   * learned this", which a filtered list cannot express on its own. The upstream
   * package now ships the number that makes it urgent: 4,617 churches (30%) carry
   * no state, because the geography pass reads the homepage footer only. So the
   * moment somebody picks a state, a THIRD of the corpus leaves the list — and
   * every one of those churches might be in that state.
   *
   * Counted against the set narrowed by every OTHER filter, so it answers the
   * question actually being asked: of the churches I would otherwise be looking
   * at, how many is the region filter dropping for lack of an answer.
   */
  noRegion: number;
}

/**
 * The axis comes in from the caller — see `favorAxisMax` — because it is a
 * property of the WHOLE corpus, not of the filtered rows. Deriving it here from
 * `base` would rescale the bars as the user filters, which makes filtering feel
 * like the data is changing.
 */
export function summarize(
  base: readonly ChurchView[],
  total: number,
  axisMax: number,
  scores: Map<string, number>,
  isEarlier: (orgId: string) => boolean = () => false,
  noRegion = 0,
): Summary {
  const max = Math.max(1, axisMax);
  const dist = Array<number>(max + 1).fill(0);
  let collected = 0;
  for (const v of base) {
    dist[favorBucket(scores.get(v.id) ?? 0, max)]++;
    if (isEarlier(v.id)) collected++;
  }
  return { n: base.length, total, dist, collected, noRegion };
}

/**
 * How many churches the region filter is dropping FOR HAVING NO REGION, as
 * opposed to for having a different one.
 *
 * Zero unless a region filter is actually set — the number is only meaningful
 * as an account of what a specific choice is costing, and reporting "4,617 have
 * no state" over an unfiltered list would be noise on every screen.
 *
 * Measured against everything else the user has already narrowed to, by re-running
 * the same filter with only the region clause removed. The alternative — counting
 * blanks across the whole corpus — would answer a question nobody asked and would
 * disagree with the list on screen the moment any other facet was set.
 *
 * ONE EXTRA PASS, and only while a region is chosen. The console already makes
 * several for the facet counts.
 */
function unlocatedCount(
  views: readonly ChurchView[],
  f: LeadFilters,
  ctx: EngineCtx,
  isMarked: MarkLookup,
): number {
  if (!f.country && !f.subdiv) return 0;

  /**
   * BOTH CLAUSES AT ONCE, because both hide for the same reason.
   *
   * The first version dropped only the narrower clause — with a state chosen it
   * counted "in this country, no state" and stopped there. Against the real
   * corpus that reports ZERO, and the reason is worth writing down: geography
   * arrives all-or-nothing. A church has city, region and country together or it
   * has none of them, so the 4,617 blanks are all missing the COUNTRY, and a
   * count that only looked at the state clause found nothing to report at
   * precisely the moment the list had shrunk by a third.
   */
  const wider = baseFiltered(views, { ...f, country: "", subdiv: "" }, ctx, isMarked);

  let n = 0;
  for (const v of wider) {
    // No country at all — it cannot match any country, nor any state within one.
    if (!v.country) {
      n++;
      continue;
    }
    // A DIFFERENT country is a real non-match. Counting it here would turn this
    // number into "everything the filter removed", which is just `total - n`.
    if (f.country && v.country !== f.country) continue;
    // In the chosen country, but we never learned which part of it.
    if (f.subdiv && !v.subdiv) n++;
  }
  return n;
}

export interface ViewResult {
  base: ChurchView[];
  rows: ChurchView[];
  summary: Summary;
  scores: Map<string, number>;
}

export function computeView(
  views: readonly ChurchView[],
  f: LeadFilters,
  ctx: EngineCtx,
  isMarked: MarkLookup = NO_MARKS,
  /** In a batch that is not the one being collected into. */
  isEarlier: (orgId: string) => boolean = () => false,
): ViewResult {
  const base = baseFiltered(views, f, ctx, isMarked);

  // Score once per pass, not once per comparator call.
  const scores = new Map<string, number>();
  for (const v of base) scores.set(v.id, favorScore(v, ctx));

  // Scored over every church, so the axis does not move while filtering.
  const axisMax = favorAxisMax(views, ctx);
  const summary = summarize(
    base,
    views.length,
    axisMax,
    scores,
    isEarlier,
    unlocatedCount(views, f, ctx, isMarked),
  );

  /**
   * A SELECTED BUCKET THAT NO LONGER HAS A BAR IS IGNORED.
   *
   * The axis is derived from the tuning model, so lowering any weight in the
   * Favor panel shrinks it — and a bucket selected before that can end up past
   * the end of `dist`. What the user saw was: the list empties, the selected
   * bar is GONE from the histogram, and the only control that could clear the
   * filter went with it. The escape was "reset all filters", which discards the
   * region, the facets and everything else they had set up.
   *
   * Dropping it here rather than in the component means the histogram, the count
   * and the rows cannot disagree about whether it is still in force — this is
   * the same rule `visibleFacetValues` applies to a facet whose values vanish.
   */
  const bucket =
    f.favorBucket != null && f.favorBucket < summary.dist.length ? f.favorBucket : null;

  let rows = base;
  if (bucket != null) {
    rows = base.filter((v) => favorBucket(scores.get(v.id) ?? 0, axisMax) === bucket);
  }

  const sort = comparator(f.sort, scores);
  rows = rows.slice().sort(f.newFirst ? demoteCollected(sort, isEarlier) : sort);

  /**
   * THE HEADLINE COUNTS THE ROWS ON SCREEN.
   *
   * `summarize` runs over `base`, which is everything except the bucket — so
   * with a bar selected the deck read "15,273 / 15,273 churches" above fifteen
   * rows. `dist` and `noRegion` stay measured against `base` on purpose: the
   * bars must not rescale when you click one, and the region note is about what
   * the region filter cost, not about the bucket.
   */
  return { base, rows, summary: { ...summary, n: rows.length }, scores };
}

/* ------------------------------------------------------------------- sorts */

/**
 * MISSING SORTS LAST, AND A SENTINEL CHARACTER CANNOT SAY THAT.
 *
 * The state sort substituted `"~"` for an absent subdivision on the theory that
 * tilde sorts after every letter. It does not: `"~".localeCompare("Z") === -1`
 * under ICU root collation, which ignores punctuation at the primary level. So
 * the sentinel did the exact opposite of its comment and promoted all 4,701
 * region-less churches to the TOP of Sort by State — the first row with an
 * actual state was at position 4,702.
 *
 * `byName` had the same shape with no sentinel at all, so the 12 unnamed
 * churches led Sort by Name AND led every tie group in every other sort, since
 * every sort falls back to name.
 *
 * A boolean compared first is the only version that cannot be wrong about the
 * collation, because it never asks the collator about the missing case.
 */
const absent = (s: string | undefined) => (s && s.trim() ? 0 : 1);

const byName = (a: ChurchView, b: ChurchView) =>
  absent(a.name) - absent(b.name) || a.name.localeCompare(b.name);

/** Unparseable dates sort LAST — never first, and never in the middle. */
function scrapedAt(v: ChurchView): number {
  const d = v.fetchedLast ? Date.parse(v.fetchedLast) : NaN;
  return isNaN(d) ? -Infinity : d;
}

/**
 * Every sort falls back to name, so the order is stable and a re-render never
 * reshuffles equal rows. Every sort puts missing data LAST — never first, and
 * never in the middle as if it were a value.
 */
/**
 * Wrap a sort so churches collected in an EARLIER batch fall to the bottom.
 *
 * Applied OVER the chosen sort rather than inside each case, so every sort keeps
 * its own meaning and gains this for free.
 *
 * Churches in the OPEN batch are deliberately not demoted. They are today's
 * work; sinking them would make the list reshuffle under someone the moment they
 * collected a row, which is the fastest way to lose your place in a list of
 * fourteen thousand.
 */
export function demoteCollected(
  inner: (a: ChurchView, b: ChurchView) => number,
  isEarlier: (orgId: string) => boolean,
): (a: ChurchView, b: ChurchView) => number {
  return (a, b) => {
    const ea = isEarlier(a.id) ? 1 : 0;
    const eb = isEarlier(b.id) ? 1 : 0;
    return ea - eb || inner(a, b);
  };
}

export function comparator(
  sort: SortKey,
  scores: Map<string, number>,
): (a: ChurchView, b: ChurchView) => number {
  switch (sort) {
    case "steps":
      return (a, b) => {
        const av = a.steps.looked ? a.steps.nPresent : -1;
        const bv = b.steps.looked ? b.steps.nPresent : -1;
        return bv - av || byName(a, b);
      };
    case "name":
      return byName;
    case "paid":
      return (a, b) => (b.q("q2")?.count ?? -1) - (a.q("q2")?.count ?? -1) || byName(a, b);
    case "state":
      // Churches with no subdivision go last — see `absent`, and do not go back
      // to a sentinel character.
      return (a, b) =>
        absent(a.subdiv) - absent(b.subdiv) ||
        (a.subdiv ?? "").localeCompare(b.subdiv ?? "") ||
        byName(a, b);
    case "scraped":
      return (a, b) => scrapedAt(b) - scrapedAt(a) || byName(a, b);
    case "opp":
    default:
      return (a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || byName(a, b);
  }
}

/** Distinct values present, for the region cascade. Derived from the data, never a fixed list. */
export function countryValues(views: readonly ChurchView[]): string[] {
  return [...new Set(views.map((v) => v.country).filter(Boolean))].sort();
}

/** Empty means the dropdown has nothing to say and is hidden entirely. */
export function subdivValues(views: readonly ChurchView[], country: string): string[] {
  const s = new Set<string>();
  for (const v of views) {
    if (!country || v.country === country) {
      if (v.subdiv) s.add(v.subdiv);
    }
  }
  return [...s].sort();
}

export function networkValues(views: readonly ChurchView[]): string[] {
  return [...new Set(views.map((v) => v.network).filter(Boolean))].sort();
}

export { PLATFORM_FACETS };
