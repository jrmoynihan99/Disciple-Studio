/**
 * Which plate a logo is drawn on.
 *
 * A logo that renders white-on-white is indistinguishable from a logo we never
 * found, so the plate choice decides whether the tile tells the truth about our
 * own data. `logoPlate` is a pure function precisely so that decision is
 * testable here rather than only by looking at 134 thumbnails.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { PLATE_CLASS, logoPlate } from "../logo.ts";
import { HAVE_FIXTURE, loadIndex } from "./fixture.mts";

describe("logo plates", () => {
  test("a classified light logo gets white, which is what it was drawn for", () => {
    assert.equal(logoPlate("light"), "white");
    assert.equal(logoPlate("either"), "white", "reads on both by definition");
  });

  test("a cut-out gets the dark plate", () => {
    assert.equal(logoPlate("dark"), "dark");
  });

  /**
   * THE BRANCH THE FIXTURE CANNOT REACH.
   *
   * `unknown` is 0 of 134 here and will not be at 14,400. If it ever resolved to
   * white, every unclassified white cut-out would vanish into the tile and read
   * as "no logo found" — reporting missing data we actually have.
   */
  test("an unknown or unrecognised polarity falls back to the checkerboard", () => {
    assert.equal(logoPlate("unknown"), "checker");
    assert.equal(logoPlate(null), "checker");
    assert.equal(logoPlate(undefined), "checker");
    assert.equal(logoPlate(""), "checker");
    // A value a future pipeline invents is not a licence to guess white.
    assert.equal(logoPlate("mid-tone"), "checker");
    assert.equal(logoPlate("LIGHT"), "checker", "the vocabulary is lower-case; do not fuzzy-match");
  });

  test("the three plates map to three distinct classes", () => {
    const classes = Object.values(PLATE_CLASS);
    assert.equal(new Set(classes).size, 3, "two plates sharing a class is one plate");
    assert.ok(classes.every(Boolean));
  });

  test(
    "every logo_theme the fixture publishes is one we handle",
    { skip: !HAVE_FIXTURE && "fixture not present" },
    () => {
      const seen = new Map<string, number>();
      for (const r of loadIndex()) {
        if (!r.lo || !r.lx) continue;
        const lt = r.lt ?? "(absent)";
        seen.set(lt, (seen.get(lt) ?? 0) + 1);
      }
      // Documented vocabulary: light / dark / either / unknown.
      for (const lt of seen.keys()) {
        assert.ok(
          ["light", "dark", "either", "unknown", "(absent)"].includes(lt),
          `unexpected logo_theme "${lt}" — decide its plate before it ships`,
        );
      }
      // Pins today's split so a publish that stops classifying is visible.
      assert.equal(seen.get("dark"), 64);
      assert.equal(seen.get("light"), 48);
      assert.equal(seen.get("either"), 18);
      assert.equal(seen.get("unknown"), undefined, "0 here — the checker branch is untested by real data");
    },
  );
});
