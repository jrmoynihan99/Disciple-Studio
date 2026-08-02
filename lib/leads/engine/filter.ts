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

/** The colour a facet OPTION paints, so the swatch can never disagree with the cell. */
export function optionState(
  key: string,
  value: string,
  views: readonly ChurchView[],
  ctx: EngineCtx,
): { state: VerdictState | ""; mixed: boolean } {
  // A platform is a fact, not a verdict — no swatch. The two backend facets are
  // the same kind of thing: "runs Breeze" is not good or bad, it is true.
  if (key.endsWith("_platform") || key === "lang" || key === "chms" || key === "tooling") {
    return { state: "", mixed: false };
  }
  if (key === "steps") return { state: stepsCountState(Number(value) || 0), mixed: false };
  // The discipleship states carry the same colours the tile does, from one map.
  if (key === "pathway") {
    return { state: PATHWAY_STATE[value as PathwayKnowledge] ?? "", mixed: false };
  }

  const qk = key as QuestionKey;
  const tally = new Map<VerdictState, number>();
  for (const v of views) {
    if (facetVal(key, v) !== value) continue;
    const s = colorState(qk, v.q(qk), ctx);
    tally.set(s, (tally.get(s) ?? 0) + 1);
  }
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
): Summary {
  const max = Math.max(1, axisMax);
  const dist = Array<number>(max + 1).fill(0);
  let collected = 0;
  for (const v of base) {
    dist[favorBucket(scores.get(v.id) ?? 0, max)]++;
    if (isEarlier(v.id)) collected++;
  }
  return { n: base.length, total, dist, collected };
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
  const summary = summarize(base, views.length, axisMax, scores, isEarlier);

  let rows = base;
  if (f.favorBucket != null) {
    rows = base.filter((v) => favorBucket(scores.get(v.id) ?? 0, axisMax) === f.favorBucket);
  }

  const sort = comparator(f.sort, scores);
  rows = rows.slice().sort(f.newFirst ? demoteCollected(sort, isEarlier) : sort);
  return { base, rows, summary, scores };
}

/* ------------------------------------------------------------------- sorts */

const byName = (a: ChurchView, b: ChurchView) => a.name.localeCompare(b.name);

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
      // "~" sorts after every letter, so churches with no subdivision go last.
      return (a, b) => (a.subdiv || "~").localeCompare(b.subdiv || "~") || byName(a, b);
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
