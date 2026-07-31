/**
 * The user recolour layer.
 *
 * WHY THIS TEST EXISTS SEPARATELY: `golden-colors.json` was generated with NO
 * user colours (`"user_colors": "none"`), so the golden test exercises the
 * override branch exactly zero times. A port that dropped the override lookup
 * entirely would still be 1,340/1,340 green. This is the only thing standing
 * between that bug and production.
 *
 * The override is consulted FIRST, before the static table and before every
 * computed rule, which is what lets a user recolour the questions whose default
 * colour is not a function of the answer alone (q2's staff band, q3's two axes,
 * q4's explicit cell).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { churchFromIndex } from "../adapt.ts";
import { colorState } from "../color.ts";
import { defaultFavorModel, favorScore } from "../favor.ts";
import type { ColorOverrides, EngineCtx } from "../types.ts";
import { HAVE_FIXTURE, loadIndex } from "./fixture.mts";

function ctxWith(overrides: ColorOverrides, rows: ReturnType<typeof loadIndex>): EngineCtx {
  return { overrides, favor: defaultFavorModel(), rows };
}

describe("user colour overrides", { skip: !HAVE_FIXTURE && "fixture not present" }, () => {
  const rows = loadIndex();
  const plain = ctxWith({}, rows);

  const noLogin = rows.find((r) => r.q5?.a === "no_login_link")!;
  const modern = rows.find((r) => r.q7?.a === "modern")!;

  test("the fixture gives us the two churches this test needs", () => {
    assert.ok(noLogin, "need a no_login_link church");
    assert.ok(modern, "need a modern-website church");
  });

  test("baseline: green means good FOR THE SELLER, not good for the church", () => {
    // The single most invertible fact in the product.
    assert.equal(colorState("q5", churchFromIndex(noLogin).q("q5"), plain), "good",
      "no member login is the strongest opportunity → green");
    assert.equal(colorState("q7", churchFromIndex(modern).q("q7"), plain), "bad",
      "a modern site means nothing to sell → red");
  });

  test("an override beats the static table", () => {
    const ctx = ctxWith({ q5: { no_login_link: "bad" } }, rows);
    assert.equal(colorState("q5", churchFromIndex(noLogin).q("q5"), ctx), "bad");
  });

  test("an override beats a COMPUTED colour, which is why it is its own layer", () => {
    // q2's colour comes from the staff tier, q9/q10's from a count band, q4's
    // from the record's own `cell`. None is a lookup on the answer, so none
    // could live in COLOR_DEFAULTS — the override has to sit in front of all of
    // them.
    const staffed = rows.find((r) => r.q2?.a === "counted")!;
    const before = colorState("q2", churchFromIndex(staffed).q("q2"), plain);
    const ctx = ctxWith({ q2: { counted: "unver" } }, rows);
    assert.notEqual(before, "unver");
    assert.equal(colorState("q2", churchFromIndex(staffed).q("q2"), ctx), "unver");

    const q4row = rows.find((r) => r.q4?.cell)!;
    const ctx4 = ctxWith({ q4: { [q4row.q4!.a!]: "good" } }, rows);
    assert.equal(colorState("q4", churchFromIndex(q4row).q("q4"), ctx4), "good",
      "an override must beat a record naming its own cell");
  });

  test("clearing an override falls straight back to the built-in logic", () => {
    const ctx = ctxWith({ q5: { no_login_link: "bad" } }, rows);
    assert.equal(colorState("q5", churchFromIndex(noLogin).q("q5"), ctx), "bad");
    // Absent key, not an empty string — that is what "clear" means here.
    assert.equal(colorState("q5", churchFromIndex(noLogin).q("q5"), plain), "good");
  });

  test("an override applies to that ANSWER only, never the whole question", () => {
    const ctx = ctxWith({ q5: { no_login_link: "bad" } }, rows);
    const other = rows.find((r) => r.q5?.a === "generic_cc")!;
    assert.equal(colorState("q5", churchFromIndex(other).q("q5"), ctx), "good2",
      "recolouring no_login_link must not touch generic_cc");
  });

  /**
   * A recolour changes what every colour MEANS, so it must reach the score too —
   * otherwise the chip and the cell tell different stories about one church.
   */
  test("a recolour propagates into the favor score", () => {
    const view = churchFromIndex(noLogin);
    const before = favorScore(view, plain);
    const after = favorScore(view, ctxWith({ q5: { no_login_link: "bad" } }, rows));
    assert.notEqual(before, after, "q5 green→red must cost the church its login points");
    assert.ok(after < before);
  });

  test("an override on an unrelated question changes nothing", () => {
    const view = churchFromIndex(noLogin);
    const ctx = ctxWith({ q10: { multisite: "bad" } }, rows);
    // q10 does not score at all — only q2/q5/q7/q8 and next steps do.
    assert.equal(favorScore(view, ctx), favorScore(view, plain));
  });
});
