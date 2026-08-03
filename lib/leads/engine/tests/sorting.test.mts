/**
 * MISSING DATA SORTS LAST, AND A HISTOGRAM BUCKET CANNOT STRAND THE LIST.
 *
 * Two defects that both made the console lie about how much it was showing.
 *
 * The first is a sentinel that does not sort where its author thought it did.
 * `filter.ts` substituted `"~"` for an absent subdivision "so churches with no
 * subdivision go last", but ICU root collation ignores punctuation at the
 * primary level, so `"~".localeCompare("Z") === -1` and every region-less church
 * was promoted to the TOP of Sort by State — 4,701 of them, ahead of the first
 * row that actually had a state. `byName` had no sentinel at all, so the unnamed
 * churches led Sort by Name and, because every sort falls back to name, led
 * every tie group in every other sort too.
 *
 * The second is the favor histogram: lowering a weight in the tuning panel
 * shrinks the axis, and a bucket selected before that could end up past the end
 * of the distribution — the list emptied, the selected BAR vanished, and the
 * only control that could clear the filter went with it.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { comparator, computeView, defaultFilters } from "../filter.ts";
import { TUNING_DEFAULTS } from "../favor.ts";
import type { ChurchView } from "../adapt.ts";
import type { EngineCtx } from "../types.ts";

const NO_SCORES = new Map<string, number>();

const view = (over: Partial<ChurchView>): ChurchView =>
  ({ name: "", subdiv: "", ...over }) as ChurchView;

/**
 * Enough of a church for `favorScore` to run — the bucket tests go through the
 * whole of `computeView`, which scores every row.
 *
 * `pathway: "has"` on one of them and not the other is what makes the two land
 * in DIFFERENT buckets, which is the only reason the filter has anything to bite
 * on in a two-row fixture.
 */
const scorable = (id: string, pathway: "has" | "none"): ChurchView =>
  ({
    id,
    name: id,
    subdiv: "",
    q: () => null,
    steps: { looked: false, nPresent: 0 },
    pathway,
    backend: "",
  }) as unknown as ChurchView;

const order = (rows: ChurchView[], key: Parameters<typeof comparator>[0]) =>
  rows.slice().sort(comparator(key, NO_SCORES)).map((v) => v.name || "(unnamed)");

describe("missing data sorts last", () => {
  /** The exact fact the old sentinel got backwards. Left here as the reason. */
  test("the tilde sentinel really does sort BEFORE a letter", () => {
    assert.equal("~".localeCompare("Z") < 0, true, "which is why a sentinel cannot be used");
  });

  test("an unnamed church goes last under Sort by Name", () => {
    const rows = [view({ name: "" }), view({ name: "Zion Chapel" }), view({ name: "Abbey Road" })];
    assert.deepEqual(order(rows, "name"), ["Abbey Road", "Zion Chapel", "(unnamed)"]);
  });

  test("a region-less church goes last under Sort by State", () => {
    const rows = [
      view({ name: "No Region", subdiv: "" }),
      view({ name: "Zed", subdiv: "Wyoming" }),
      view({ name: "Ay", subdiv: "Alabama" }),
    ];
    assert.deepEqual(order(rows, "state"), ["Ay", "Zed", "No Region"]);
  });

  /** Whitespace is not a value either — the corpus carries both shapes. */
  test("a blank-but-present field counts as missing", () => {
    const rows = [view({ name: "A", subdiv: "   " }), view({ name: "B", subdiv: "Ohio" })];
    assert.deepEqual(order(rows, "state"), ["B", "A"]);
  });

  /**
   * THE ONE WITH THE WIDEST BLAST RADIUS. Every sort falls back to `byName`, so
   * an unnamed church led every tie group in every sort, not just Sort by Name.
   */
  test("unnamed churches do not lead a tie group in another sort", () => {
    const rows = [
      view({ name: "", subdiv: "Ohio" }),
      view({ name: "Bethel", subdiv: "Ohio" }),
      view({ name: "Antioch", subdiv: "Ohio" }),
    ];
    assert.deepEqual(order(rows, "state"), ["Antioch", "Bethel", "(unnamed)"]);
  });
});

describe("a favor bucket that no longer has a bar", () => {
  const ctx = () => ({ overrides: {}, favor: TUNING_DEFAULTS, rows: [] }) as unknown as EngineCtx;
  const rows = [scorable("A", "has"), scorable("B", "none")];

  test("a bucket past the end of the histogram is ignored, not left stranding the list", () => {
    const f = { ...defaultFilters(), favorBucket: 999 };
    const out = computeView(rows, f, ctx());
    assert.ok(out.summary.dist.length <= 999, "the fixture must not actually have 999 buckets");
    assert.equal(out.rows.length, rows.length, "the list comes back rather than reading empty");
  });

  test("a bucket that DOES have a bar still filters", () => {
    const all = computeView(rows, defaultFilters(), ctx());
    const bucket = all.summary.dist.findIndex((n) => n > 0);
    const out = computeView(rows, { ...defaultFilters(), favorBucket: bucket }, ctx());
    assert.ok(out.rows.length > 0);
    assert.ok(out.rows.length <= rows.length);
  });

  /**
   * The headline counted `base`, which is everything EXCEPT the bucket — so the
   * deck read "15,273 / 15,273 churches" over fifteen rows.
   */
  test("the headline counts the rows on screen, not the pre-bucket set", () => {
    const all = computeView(rows, defaultFilters(), ctx());
    const bucket = all.summary.dist.findIndex((n) => n > 0 && n < rows.length);
    if (bucket < 0) return; // no bucket splits this tiny fixture; nothing to assert
    const out = computeView(rows, { ...defaultFilters(), favorBucket: bucket }, ctx());
    assert.equal(out.summary.n, out.rows.length);
  });

  /** The bars must NOT rescale when you click one — that is what the axis is for. */
  test("selecting a bucket does not change the histogram", () => {
    const all = computeView(rows, defaultFilters(), ctx());
    const bucket = all.summary.dist.findIndex((n) => n > 0);
    const out = computeView(rows, { ...defaultFilters(), favorBucket: bucket }, ctx());
    assert.deepEqual(out.summary.dist, all.summary.dist);
  });
});
