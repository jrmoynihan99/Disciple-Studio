/**
 * The SHIPPED tuning defaults.
 *
 * `golden.test.mts` deliberately pins the reference model instead of this one,
 * which leaves the numbers the console actually starts on unguarded. This is
 * that guard. It needs no fixture, so it runs everywhere.
 *
 * These are product decisions, not measurements — every one is a knob the user
 * can turn — but they are where the sliders sit for someone who never opens the
 * panel, which is most people. Changing a number here changes the ranking of
 * 14,400 churches, so it should require editing a test that says so.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  defaultFavorModel,
  favorAxisMax,
  favorBase,
  favorBucket,
  favorMax,
  favorScore,
  referenceFavorModel,
} from "../favor.ts";
import { staffPts, staffTier } from "../staff.ts";
import type { QuestionView } from "../types.ts";

const counted = (n: number): QuestionView =>
  ({ answer: "counted", count: n }) as QuestionView;

describe("shipped favor tuning", () => {
  const favor = defaultFavorModel();

  test("the seven staff bands are contiguous and cover every count", () => {
    const tiers = favor.staffTiers;
    assert.equal(tiers.length, 7);
    assert.equal(tiers[0].lo, 0, "the first band must start at zero");
    assert.equal(tiers[tiers.length - 1].hi, null, "the last band must be open-ended");
    for (let i = 1; i < tiers.length; i++) {
      assert.equal(
        tiers[i].lo,
        (tiers[i - 1].hi ?? 0) + 1,
        `band ${i} must begin where band ${i - 1} ends — a gap silently scores 0`,
      );
    }
  });

  /**
   * `staffTier` returns the FIRST matching band, so an overlap would not throw;
   * it would just make a later band unreachable. Checking the resolved points
   * for a representative count in each band is what catches that.
   */
  test("each band awards the points the owner set", () => {
    const want: [number, number][] = [
      [0, -2],
      [3, -2],
      [4, -2],
      [5, -1],
      [9, -1],
      [10, 0],
      [11, 1],
      [25, 1],
      [26, 2],
      [40, 2],
      [41, 2],
      [59, 2],
      [60, 2],
      [4000, 2],
    ];
    for (const [count, pts] of want) {
      assert.equal(staffPts(counted(count), favor), pts, `${count} staff`);
    }
  });

  test("small churches score below an unknown one, which is the whole point", () => {
    // A church we never measured contributes 0. A church we KNOW is tiny has to
    // rank under it, or the negative bands do nothing to the call list.
    assert.ok(staffPts(counted(3), favor) < 0);
    assert.equal(staffPts(null, favor), 0, "unmeasured is 0, never negative");
    assert.equal(staffTier(null, favor), null);
  });

  test("custom login is the heaviest single signal", () => {
    assert.equal(favor.loginPts, 3);
    assert.ok(
      favor.loginPts > favor.websitePts + favor.appPts,
      "it is the thing being sold; nothing else may outweigh it",
    );
  });

  test("the denominators follow from the knobs", () => {
    // staffMax 2 + login 3 + steps 2.5 + discipleship pathway 1 + ChMS 1
    assert.equal(favorBase(favor), 9.5);
    // + website 1 + app 0.5
    assert.equal(favorMax(favor), 11);
    assert.ok(favorMax(favor) > favorBase(favor));
  });

  test("the reference model is untouched by the re-tune", () => {
    // The golden table depends on this being exactly core.js's numbers.
    const ref = referenceFavorModel();
    assert.equal(favorBase(ref), 5);
    assert.equal(favorMax(ref), 6.5);
    assert.equal(ref.loginPts, 0.5);
    assert.equal(ref.staffTiers.length, 5);
    // core.js has no discipleship term at all. If this ever became non-zero the
    // golden table's 15,274 favor values would all move, and the M0 gate would
    // be measuring the product's current opinion instead of the port.
    assert.equal(ref.pathwayPts, 0);
    assert.equal(ref.chmsPts, 0);
  });

  /**
   * The ChMS point pays for church MANAGEMENT, never for the giving processors
   * and media libraries sharing the same field.
   *
   * This is the reason `pf` had to be split before it could be scored at all: a
   * single point over the raw field would have paid 2,758 churches for owning a
   * card reader, and it would have looked identical in the chip to a church
   * running Realm.
   */
  test("the ChMS point pays for church management, not for tooling", () => {
    const ctx = { overrides: {}, favor, rows: [] };
    const at = (backend: string) => favorScore(blankView({ backend }), ctx);
    const none = at("");

    for (const k of ["breeze", "realm", "ccb", "church_center", "churchtrac"]) {
      assert.equal(at(k) - none, 1, `${k} is a ChMS and should score`);
    }
    for (const k of ["givelify", "vanco", "rightnowmedia", "clearstream", "pushpay"]) {
      assert.equal(at(k) - none, 0, `${k} is not a ChMS and must not score`);
    }
    // A vendor selling both halves scores, because it IS in the ChMS list.
    for (const k of ["tithely", "subsplash", "ministrybrands", "faithlife"]) {
      assert.equal(at(k) - none, 1, `${k} sells a ChMS and should score`);
    }
    // Nothing detected is not a penalty — 1,359 churches carry no platform key,
    // which is our gap as much as theirs.
    assert.equal(at("unknown"), none);
  });

  /**
   * A view carrying nothing, so a test can vary exactly one field and read the
   * difference in the score. Every question answers null and no next-step page
   * was read, which zeroes every other term.
   */
  const blankView = (over: Partial<Record<string, unknown>> = {}) =>
    ({
      id: "x",
      name: "x",
      q: () => null,
      steps: { looked: false, present: [], cats: [], nPresent: 0, nCats: 8 },
      country: "",
      subdiv: "",
      network: "",
      lang: "",
      platformLine: "",
      fetchedLast: "",
      pathway: "unknown",
      pathwaySteps: 0,
      backend: "",
      ...over,
    }) as unknown as Parameters<typeof favorScore>[0];

  /**
   * The pathway point is BINARY and only pays for a pathway we found.
   *
   * Scoring `none` and `unknown` differently would put a number on the
   * difference between "this church publishes none" and "we never looked", and
   * the second is two thirds of the corpus. The colour distinguishes them; the
   * score must not, because a score is arithmetic somebody sorts by.
   */
  test("the discipleship point is binary and never pays for an absence", () => {
    const ctx = { overrides: {}, favor, rows: [] };
    const view = (pathway: "has" | "none" | "unknown", pathwaySteps = 0) =>
      blankView({ pathway, pathwaySteps });

    const two = favorScore(view("has", 2), ctx);
    const ten = favorScore(view("has", 10), ctx);
    assert.equal(two, ten, "a ten-step pathway must not outscore a two-step one");
    assert.equal(two - favorScore(view("unknown"), ctx), 1, "a pathway is worth exactly the knob");
    assert.equal(
      favorScore(view("none"), ctx),
      favorScore(view("unknown"), ctx),
      "an unmeasured absence must score the same as a measured one",
    );
  });

  /**
   * The histogram axis is a fact about the DATA, not about the tuning.
   *
   * `favorMax` is the model's ceiling — every knob at once, on a church that has
   * everything — and with the shipped weights that is 11 while no church reaches
   * past 9.5. Drawing to 11 left two permanently empty bars, which reads as
   * "there are leads up there we are not seeing".
   */
  test("the axis is the best score in the data, floored — not the model ceiling", () => {
    const ctx = { overrides: {}, favor, rows: [] };
    const at = (backend: string, pathway: "has" | "unknown") =>
      blankView({ backend, pathway });

    // Two churches: one scoring 0, one scoring exactly 2 (ChMS + pathway).
    const views = [at("", "unknown"), at("breeze", "has")];
    assert.equal(favorScore(views[1], ctx), 2);
    assert.equal(favorAxisMax(views, ctx), 2, "the axis follows the best church, not favorMax");
    assert.ok(favorMax(favor) > 2, "the model ceiling is much higher, and must not be the axis");

    // It never exceeds the model ceiling, however the data looks.
    assert.ok(favorAxisMax(views, ctx) <= Math.ceil(favorMax(favor)));
    // And never collapses to nothing when every church scores zero or less.
    assert.equal(favorAxisMax([at("", "unknown")], ctx), 1);
  });

  /**
   * FLOOR, NOT ROUND. A bar labelled 9 must mean "scored at least 9" — rounding
   * put a church on 8.6 into the 9 bar, so the strongest bar contained churches
   * that had not reached it.
   */
  test("a bucket floors, so a bar never contains a church below its label", () => {
    assert.equal(favorBucket(8.6, 9), 8);
    assert.equal(favorBucket(9.0, 9), 9);
    assert.equal(favorBucket(9.5, 9), 9, "above the axis clamps down onto it");
    assert.equal(favorBucket(-2, 9), 0, "a negative score still has a bar to sit in");
  });

  test("nothing shares mutable state with the constant", () => {
    const a = defaultFavorModel();
    a.staffTiers[0].pts = 99;
    a.stepCat.giving = 99;
    const b = defaultFavorModel();
    assert.equal(b.staffTiers[0].pts, -2);
    assert.equal(b.stepCat.giving, 0.3125);
  });
});
