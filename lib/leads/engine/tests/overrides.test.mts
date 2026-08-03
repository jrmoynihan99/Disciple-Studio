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
import { favorScore, referenceFavorModel } from "../favor.ts";
import type { ColorOverrides, EngineCtx } from "../types.ts";
import { HAVE_FIXTURE, loadIndex } from "./fixture.mts";

function ctxWith(overrides: ColorOverrides, rows: ReturnType<typeof loadIndex>): EngineCtx {
  return { overrides, favor: referenceFavorModel(), rows };
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

/**
 * The product-decision layer, between the user's overrides and the generated
 * table.
 *
 * `COLOR_DEFAULTS` records what the reference `core.js` does and is regenerated
 * from the pipeline's vocab, so a decision to paint something differently cannot
 * live there — it would be overwritten, and it would make `golden-colors.json`
 * stop being evidence that this port is faithful. It lives in `COLOR_PATCH`
 * instead, and these are the two properties that make that safe: it must beat
 * the table, and it must still lose to a human.
 */
describe("owner colour patches", { skip: !HAVE_FIXTURE && "fixture not present" }, () => {
  const rows = loadIndex();
  const plain = ctxWith({}, rows);
  const candidate = rows.find((r) => r.q5?.a === "custom_candidate")!;

  test("the fixture has a church with a possible custom login", () => {
    assert.ok(candidate, "need a custom_candidate church");
  });

  /**
   * The whole point of the change. A CONFIRMED custom login is `bad`; a possible
   * one is the "likely" grade of the same finding. It used to be `unver`, whose
   * wording ("Needs a check" / "Can't confirm") promised a render check that was
   * retired upstream — slate was telling ~1 church in 6 to go and do something
   * nobody can do.
   */
  test("a possible custom login is light red, not slate", () => {
    const view = churchFromIndex(candidate);
    assert.equal(colorState("q5", view.q("q5"), plain), "bad2");
  });

  /** The patch must not leak into its neighbours in the same table. */
  test("the other login answers are exactly where they were", () => {
    const want: Record<string, string> = {
      no_login_link: "good",
      generic_cc: "good2",
      unknown: "unk",
    };
    for (const [answer, state] of Object.entries(want)) {
      const row = rows.find((r) => r.q5?.a === answer);
      if (!row) continue;
      assert.equal(colorState("q5", churchFromIndex(row).q("q5"), plain), state, answer);
    }
  });

  /**
   * A PATCH IS A DEFAULT, NOT A DECREE. The rail lets anyone recolour any
   * (question, answer) pair, and that has to keep working for the pairs we have
   * an opinion about — otherwise a product decision becomes the one thing on
   * this screen a user is not allowed to disagree with.
   */
  test("a user override still wins over the patch", () => {
    const view = churchFromIndex(candidate);
    const mine = ctxWith({ q5: { custom_candidate: "good" } }, rows);
    assert.equal(colorState("q5", view.q("q5"), mine), "good");
  });

  /** And clearing it falls back to the patch, not past it to the raw table. */
  test("clearing the override returns to the patched colour, not the reference one", () => {
    const view = churchFromIndex(candidate);
    assert.equal(colorState("q5", view.q("q5"), ctxWith({ q5: {} }, rows)), "bad2");
  });

  /**
   * `favorScore` awards full points for `good`, half for `good2`, and nothing
   * for anything else — so a move between two zero-scoring states must not touch
   * a single church's score. Asserted here per-church as well as in the golden
   * table, because it is the reason the golden favor rows could stay untouched.
   */
  test("the recolour moves no church's favor score", () => {
    for (const row of rows.filter((r) => r.q5?.a === "custom_candidate")) {
      const view = churchFromIndex(row);
      const asWas = ctxWith({ q5: { custom_candidate: "unver" } }, rows);
      assert.equal(favorScore(view, plain), favorScore(view, asWas), row.id);
    }
  });
});
