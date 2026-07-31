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
  favorBase,
  favorMax,
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
    // staffMax 2 + login 3 + steps 2.5
    assert.equal(favorBase(favor), 7.5);
    // + website 1 + app 0.5
    assert.equal(favorMax(favor), 9);
    assert.ok(favorMax(favor) > favorBase(favor));
  });

  test("the reference model is untouched by the re-tune", () => {
    // The golden table depends on this being exactly core.js's numbers.
    const ref = referenceFavorModel();
    assert.equal(favorBase(ref), 5);
    assert.equal(favorMax(ref), 6.5);
    assert.equal(ref.loginPts, 0.5);
    assert.equal(ref.staffTiers.length, 5);
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
