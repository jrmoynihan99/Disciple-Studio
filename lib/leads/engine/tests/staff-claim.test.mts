/**
 * The strength of a paid-staff count, and the words that carry it.
 *
 * This exists because the shape it replaced was wrong in a way that hid itself.
 * `count_is_floor` and `count_is_uncited` are not siblings — `floor_uncited` IS
 * a floor, so both fired together, every renderer had to pick one, floor won,
 * and the second form rendered for NOBODY. Upstream hit the identical bug from
 * its own side on 12 of 100 churches.
 *
 * A bug that makes a claim invisible cannot be caught by looking at the screen.
 * It has to be asserted.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { staffClaim, staffPhrase, staffText } from "../staff.ts";
import { facetVal } from "../filter.ts";
import { recordLabel, verdictWord } from "../labels.ts";
import type { QuestionView } from "../types.ts";
import type { ChurchView } from "../adapt.ts";

const q = (over: Partial<QuestionView>): QuestionView =>
  ({ answer: "counted", count: 12, ...over }) as QuestionView;

describe("staff claim", () => {
  test("the published enum resolves straight through", () => {
    assert.equal(staffClaim(q({ count_claim: "exact" })), "exact");
    assert.equal(staffClaim(q({ count_claim: "floor" })), "floor");
    assert.equal(staffClaim(q({ count_claim: "floor_uncited" })), "floor_uncited");
  });

  /**
   * All four boolean combinations, because a publish made before the enum
   * existed must keep rendering the same claim it always did — a silent
   * downgrade to "exact" would turn "at least 12" into "12".
   */
  test("the legacy booleans map to the same claims", () => {
    assert.equal(staffClaim(q({})), "exact");
    assert.equal(staffClaim(q({ count_is_floor: true })), "floor");
    assert.equal(
      staffClaim(q({ count_is_floor: true, count_is_uncited: true })),
      "floor_uncited",
      "both flags is the case that used to be swallowed by the floor branch",
    );
    assert.equal(
      staffClaim(q({ count_is_uncited: true })),
      "uncited",
      "uncited ALONE is the weaker legacy claim — not a floor, and not to be upgraded into one",
    );
  });

  test("the enum wins over the booleans when a publish carries both", () => {
    assert.equal(staffClaim(q({ count_claim: "exact", count_is_floor: true })), "exact");
  });

  /**
   * The assertion the whole module is for: no two claims may look alike. If a
   * future precedence change collapses two, this is what says so.
   */
  test("every claim renders differently", () => {
    const rendered = [
      staffText(q({ count_claim: "exact" })),
      staffText(q({ count_claim: "floor" })),
      staffText(q({ count_claim: "floor_uncited" })),
      staffText(q({ count_claim: "uncited" })),
    ];
    assert.deepEqual(rendered, ["12", "12+", "12+?", "12?"]);
    assert.equal(new Set(rendered).size, 4, "two claims render identically");
  });

  test("the long form matches the short one, claim for claim", () => {
    const phrases = (["exact", "floor", "floor_uncited", "uncited"] as const).map((c) =>
      staffPhrase(q({ count_claim: c })),
    );
    assert.equal(new Set(phrases).size, 4);
    // The dossier used to build this itself and would not have learned about a
    // third claim. Each long form must contain its own short form.
    for (const c of ["floor", "floor_uncited", "uncited"] as const) {
      assert.ok(
        staffPhrase(q({ count_claim: c })).startsWith(staffText(q({ count_claim: c }))),
        `${c}: the phrase must lead with the rendered count`,
      );
    }
  });

  test("a count with no answer of 'counted' is not a count", () => {
    assert.equal(staffText(q({ answer: "unknown", count: null })), "—");
    assert.equal(staffPhrase(q({ answer: "unknown" })), "Not counted");
    assert.equal(staffPhrase(null), "Not counted");
    assert.equal(staffText(undefined), "—");
  });

  /**
   * The facet is derived from `staffText`, so three claims about the same number
   * are three separate buckets. Filtering to "12" must not hand back churches we
   * only know have at least twelve.
   */
  test("each claim gets its own q2 facet bucket", () => {
    const buckets = (["exact", "floor", "floor_uncited", "uncited"] as const).map((c) =>
      facetVal("q2", { q: () => q({ count_claim: c }) } as unknown as ChurchView),
    );
    assert.deepEqual(buckets, ["12", "12+", "12+?", "12?"]);
    assert.equal(new Set(buckets).size, 4, "two claims sharing a bucket is a filter that lies");
  });
});

describe("per-question verdict wording", () => {
  /**
   * q1 and q5 both reach `unver` and the state means the same thing in both, but
   * the reader's next move is opposite: opening the page RESOLVES a q1
   * `unverified`, and resolves nothing for a q5 `custom_candidate`, because the
   * confirming step was retired upstream. A shared word cannot say both.
   */
  test("q5's unver does not tell anyone to go and check", () => {
    const q5 = verdictWord("unver", "q5");
    const q1 = verdictWord("unver", "q1");
    assert.notEqual(q5, q1, "the per-question override has been simplified away");
    assert.doesNotMatch(q5, /check/i, "the confirming step no longer exists to be done");
    assert.match(q1, /check/i, "q1 unverified IS resolvable by opening the page");
  });

  test("the generic word still serves every other question", () => {
    assert.equal(verdictWord("unver", "q4"), verdictWord("unver"));
    assert.equal(verdictWord("good", "q5"), verdictWord("good"));
  });
});

describe("retired instructions in record labels", () => {
  /**
   * All 22 `q5: custom_candidate` records label themselves "Possible custom
   * login — needs a render check". The render check is not run at any scale, so
   * the clause asks for work that cannot happen.
   *
   * This is a `recordLabel` repair, NOT an `ANSWER_LABEL_PATCH` one: the patch
   * table is only consulted when a record has no label of its own, and every one
   * of these has one. A repair aimed at the table does nothing here — which is
   * how the first attempt at this fix passed its unit test and still shipped the
   * instruction to the screen.
   */
  test("the render-check instruction is dropped and the finding kept", () => {
    const real = "Possible custom login — needs a render check";
    assert.equal(recordLabel(real), "Possible custom login");
    assert.equal(recordLabel("Possible custom login - needs a check to confirm"), "Possible custom login");
  });

  test("it takes the clause, not any sentence containing the word check", () => {
    for (const keep of [
      "No login link on the homepage",
      "Generic Church Center login",
      "Checkout page found",
    ]) {
      assert.equal(recordLabel(keep), keep);
    }
  });
});
