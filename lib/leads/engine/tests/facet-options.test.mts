/**
 * WHICH OPTIONS A FACET OFFERS.
 *
 * The rail used to list every value in the corpus, so at 15,274 churches most
 * options read `0` under any real filter — Language alone offered 32 choices,
 * nearly all of them leading to an empty list.
 *
 * The interesting half is the exception. A facet WITH a selection is counted
 * against the set narrowed by the other facets (`narrowedFor` in
 * `LeadConsole.tsx`), because options inside a facet are OR'd — so a ticked
 * option can legitimately reach 0 without the user doing anything wrong. Hiding
 * it would leave a filter that is active, invisible and impossible to untick,
 * with the list empty and nothing on screen saying why. Every test below is
 * really about that one case.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { facetCounts, visibleFacetValues } from "../filter.ts";
import { churchFromIndex } from "../adapt.ts";
import { HAVE_FIXTURE, loadIndex } from "./fixture.mts";

const counts = (pairs: [string, number][]) => new Map(pairs);

describe("facet options", () => {
  test("an option no visible church has is not offered", () => {
    const values = ["en", "es", "ko"];
    assert.deepEqual(
      visibleFacetValues(values, counts([["en", 12], ["es", 3]]), []),
      ["en", "es"],
    );
  });

  test("an option with a count of zero is dropped, not shown greyed", () => {
    assert.deepEqual(visibleFacetValues(["a", "b"], counts([["a", 1], ["b", 0]]), []), ["a"]);
    // Absent from the map is the same as zero — `facetCounts` only emits keys it saw.
    assert.deepEqual(visibleFacetValues(["a", "b"], counts([["a", 1]]), []), ["a"]);
  });

  /**
   * THE ONE THAT MATTERS. Without this the user is stranded: the facet header
   * still reads "1 selected", the list is empty, and the checkbox that would
   * undo it is gone.
   */
  test("a selected option is always offered, even at zero", () => {
    assert.deepEqual(visibleFacetValues(["en", "es"], counts([["en", 40]]), ["es"]), ["en", "es"]);
    assert.deepEqual(visibleFacetValues(["en", "es"], new Map(), ["es"]), ["es"]);
  });

  test("order is preserved — the caller sorted it for a reason", () => {
    const values = ["has", "none", "unknown"];
    assert.deepEqual(
      visibleFacetValues(values, counts([["unknown", 9], ["has", 1], ["none", 4]]), []),
      values,
    );
  });

  test("nothing to offer is an empty list, never a crash", () => {
    assert.deepEqual(visibleFacetValues([], new Map(), []), []);
    assert.deepEqual(visibleFacetValues(["a"], new Map(), []), []);
  });

  /**
   * Against the real corpus, because the rule is only worth anything if the
   * unfiltered rail still offers everything. A bug that hid options at the top
   * level would look like a shorter, tidier list rather than like a fault.
   */
  test(
    "with no filters applied, nothing is hidden",
    { skip: !HAVE_FIXTURE && "fixture not present" },
    () => {
      const views = loadIndex().map(churchFromIndex);
      for (const key of ["lang", "pathway", "q5", "q7", "q8"]) {
        const c = facetCounts(key, views);
        const values = [...c.keys()];
        assert.deepEqual(
          visibleFacetValues(values, c, []),
          values,
          `${key} lost an option that real churches carry`,
        );
      }
    },
  );

  /**
   * And the narrowing actually bites: filtering to one language must leave the
   * other languages unoffered, or the rule is decoration.
   */
  test(
    "narrowing removes the options that would return nothing",
    { skip: !HAVE_FIXTURE && "fixture not present" },
    () => {
      const views = loadIndex().map(churchFromIndex);
      const all = facetCounts("lang", views);
      const values = [...all.keys()];
      assert.ok(values.length > 2, "the corpus has too few languages to test narrowing");

      const only = values[0];
      const narrowed = views.filter((v) => v.lang === only);
      const shown = visibleFacetValues(values, facetCounts("lang", narrowed), []);
      assert.deepEqual(shown, [only]);

      // …and a selection survives that same narrowing.
      const other = values[1];
      assert.deepEqual(
        visibleFacetValues(values, facetCounts("lang", narrowed), [other]),
        [only, other].sort((a, b) => values.indexOf(a) - values.indexOf(b)),
      );
    },
  );
});
