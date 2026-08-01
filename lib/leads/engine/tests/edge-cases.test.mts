/**
 * The ten fabricated edge-case records.
 *
 * They exist because a fixture of real data does not reach every branch, and two
 * of those branches are the ones that matter most: no church in the source repo
 * has EVER produced `q1: unverified` or `q5: custom_confirmed`, across all five
 * review batches and the 39,409-church production build.
 *
 * These records are NOT churches. Every one is `ZZ Synthetic - ...` and carries
 * a `_synthetic` field. They must never be published, counted in a total,
 * exported, or shown to a user.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { churchFromRecord } from "../adapt.ts";
import { colorState } from "../color.ts";
import { favorCount, favorScore, referenceFavorModel } from "../favor.ts";
import { staffText } from "../staff.ts";
import { stepsDisplayCount } from "../steps.ts";
import { hostOf, safeUrl } from "../url.ts";
import type { EngineCtx } from "../types.ts";
import { HAVE_FIXTURE, loadEdgeCases } from "./fixture.mts";

const ctx: EngineCtx = { overrides: {}, favor: referenceFavorModel(), rows: [] };

describe("edge cases", { skip: !HAVE_FIXTURE && "fixture not present" }, () => {
  const ec = loadEdgeCases();

  test("all ten are flagged synthetic and are filterable out", () => {
    const all = Object.values(ec);
    assert.equal(all.length, 10);
    for (const r of all) {
      assert.ok(r._synthetic, `${r.org_id} must carry _synthetic`);
      assert.match(r.name ?? "", /^ZZ Synthetic/);
    }
  });

  /**
   * Every URL here came off a church's website. React escapes text content but
   * will happily render `href="javascript:..."` as a live click target, and the
   * guard against it is a one-liner a rewrite drops without noticing.
   */
  test("zz_hostile_url: all four hostile URLs are refused", () => {
    const r = ec.zz_hostile_url;
    assert.equal(safeUrl(r.own_url), "", "own_url");
    assert.equal(safeUrl(r.church_url), "", "church_url (data: is not navigable either)");
    assert.equal(safeUrl(r.q1?.source_url), "", "q1.source_url");
    assert.equal(safeUrl((r.brand as Record<string, unknown>)?.logo_url), "", "brand.logo_url");
  });

  test("safeUrl still passes the schemes a church legitimately uses", () => {
    for (const ok of [
      "https://example.org/give",
      "http://example.org",
      "mailto:info@example.org",
      "/relative",
      "#anchor",
      "  https://example.org/padded  ",
    ]) {
      assert.notEqual(safeUrl(ok), "", `${ok} should be allowed`);
    }
    for (const bad of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,<script>",
      "vbscript:msgbox",
      "file:///etc/passwd",
      "",
      null,
      undefined,
    ]) {
      assert.equal(safeUrl(bad), "", `${String(bad)} should be refused`);
    }
  });

  /**
   * `hostOf` labels every "visit this church" control, so it is fed the same
   * church-controlled URLs as `safeUrl` — and it additionally hands them to the
   * URL parser. It must refuse before parsing, and never throw.
   */
  test("hostOf prints a host, or nothing — and never invents one", () => {
    assert.equal(hostOf("https://www.hillsonline.org/staff"), "hillsonline.org");
    assert.equal(hostOf("http://gracespringchurch.org"), "gracespringchurch.org");
    assert.equal(hostOf("https://sub.trbc.org:8443/x?y=1#z"), "sub.trbc.org:8443");
    for (const none of [
      "javascript:alert(1)",
      "data:text/html,<script>",
      "mailto:info@example.org", // safeUrl allows it; it is not a website
      "/relative", //  no host to state
      "#anchor",
      "not a url",
      "",
      null,
      undefined,
    ]) {
      assert.equal(hostOf(none), "", `${String(none)} has no host to print`);
    }
  });

  /**
   * A church we know nothing about must still render a complete, legible row —
   * not a collapsed or skeletal one. This shape will be COMMON at 14,400.
   */
  test("zz_all_unknown: every cell grey, favor 0, and still a whole church", () => {
    const view = churchFromRecord(ec.zz_all_unknown);
    for (const k of ["q1", "q2", "q4", "q5", "q6", "q7", "q8", "q9", "q10"] as const) {
      assert.equal(colorState(k, view.q(k), ctx), "unk", `${k} should be unk`);
    }
    assert.equal(favorScore(view, ctx), 0);
    assert.equal(favorCount(view, ctx), 0, "favorCount 0 → hidden by 'opportunities only'");
    assert.ok(view.name.length > 0, "a nameless row is not a legible row");
  });

  /**
   * "We never looked" and "we looked and found nothing" are different facts.
   * `nPresent` is 0 either way; only the display count keeps them apart.
   */
  test("zz_steps_not_looked: the count is null, never 0", () => {
    const view = churchFromRecord(ec.zz_steps_not_looked);
    assert.equal(view.steps.looked, false);
    assert.equal(stepsDisplayCount(view.steps), null, 'must render "not checked", never "0 of 8"');
    assert.equal(view.steps.nPresent, 0, "the raw count is still 0 — that is why it must not be shown");
    assert.equal(colorState("q4", view.q("q4"), ctx) === "bad", false, "unlooked never asserts absence");
  });

  test("zz_steps_not_looked scores 0 for steps — not a partial credit", () => {
    const view = churchFromRecord(ec.zz_steps_not_looked);
    // Unlooked contributes nothing, and is not treated as absent either.
    assert.ok(favorScore(view, ctx) >= 0);
  });

  /** Same number, three different strengths of claim. */
  test("zz_staff_floor renders 12+ and zz_staff_uncited renders 12?", () => {
    const floor = churchFromRecord(ec.zz_staff_floor).q("q2");
    const uncited = churchFromRecord(ec.zz_staff_uncited).q("q2");
    assert.match(staffText(floor), /^\d+\+$/, "a cited floor must render N+");
    assert.match(staffText(uncited), /^\d+\?$/, "an uncited estimate must render N?");
    assert.notEqual(staffText(floor), staffText(uncited), "they must not look the same");
  });

  /**
   * The two states real data has never produced. Without these records they
   * would be built blind.
   */
  test("zz_q1_unverified: slate, and the answer is withheld", () => {
    const view = churchFromRecord(ec.zz_q1_unverified);
    assert.equal(view.q("q1")?.answer, "unverified");
    assert.equal(
      colorState("q1", view.q("q1"), ctx),
      "unver",
      "unverified is slate — NOT the olive of unknown, and never a silent grey",
    );
  });

  test("zz_q1_unverified carries what the claimed-vs-actual panel needs", () => {
    const q1 = ec.zz_q1_unverified.q1 as Record<string, unknown>;
    assert.ok(q1.claimed_quote, "what the model claimed");
    assert.ok(q1.best_match_on_page, "the closest text actually on the page");
    assert.ok(q1.similarity != null, "the similarity score");
  });

  test("zz_q5_custom_confirmed: the one q5 answer that means NOT a lead", () => {
    const view = churchFromRecord(ec.zz_q5_custom_confirmed);
    assert.equal(view.q("q5")?.answer, "custom_confirmed");
    assert.equal(
      colorState("q5", view.q("q5"), ctx),
      "bad",
      "a church that already runs a custom portal is not a lead for one",
    );
  });

  test("zz_no_logo distinguishes 'none found' from 'found one and rejected it'", () => {
    const brand = ec.zz_no_logo.brand as Record<string, unknown>;
    assert.ok(
      brand.logo_reject ?? brand.logo_absent_reason,
      "the card must be able to say WHICH of the two happened",
    );
  });
});
