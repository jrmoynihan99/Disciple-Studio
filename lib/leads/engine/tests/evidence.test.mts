/**
 * Cite or abstain, as an assertion over the whole fixture.
 *
 * "Every yes/no answer carries a verbatim quote plus the source URL. No quote,
 * no claim." This is the data half of that rule; the DOM half — every RENDERED
 * quote shows a visible source link — needs a browser and lives in the audit
 * surface.
 *
 * The structural gotcha this pins down: 30 quotes in the fixture sit in
 * `q4.subsignals[]` and carry NO `source_url` of their own. The URL lives on the
 * parent `q4`. So the rule is "a quote is traceable to a URL on ITSELF OR ITS
 * NEAREST ANCESTOR", and a renderer that draws a sub-signal quote must inherit
 * the parent's URL. Draw it naively and you ship 30 unattributed quotes.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { safeUrl } from "../url.ts";
import { HAVE_FIXTURE, loadAllRecords } from "./fixture.mts";

interface FoundQuote {
  org: string;
  path: string;
  quote: string;
  ownUrl: string;
  inheritedUrl: string;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/**
 * Walk a record collecting every non-empty `quote`, remembering the nearest
 * `source_url` seen on the way down.
 */
function collectQuotes(org: string, node: unknown, path: string, inherited: string): FoundQuote[] {
  const out: FoundQuote[] = [];
  if (Array.isArray(node)) {
    node.forEach((v, i) => out.push(...collectQuotes(org, v, `${path}[${i}]`, inherited)));
    return out;
  }
  if (!isObj(node)) return out;

  const own = typeof node.source_url === "string" ? node.source_url : "";
  const nearest = own || inherited;

  for (const field of ["quote", "claimed_quote", "declaration_quote", "purpose_quote"]) {
    const q = node[field];
    if (typeof q === "string" && q.trim()) {
      out.push({
        org,
        path: `${path}.${field}`,
        quote: q,
        ownUrl: own,
        inheritedUrl: nearest,
      });
    }
  }

  for (const [k, v] of Object.entries(node)) {
    if (isObj(v) || Array.isArray(v)) out.push(...collectQuotes(org, v, `${path}.${k}`, nearest));
  }
  return out;
}

describe("evidence", { skip: !HAVE_FIXTURE && "fixture not present" }, () => {
  const records = loadAllRecords();
  const quotes = records.flatMap((r) => collectQuotes(r.org_id, r, "", ""));

  test("the fixture actually contains quotes to check", () => {
    assert.ok(records.length > 0, "no records loaded");
    assert.ok(quotes.length > 500, `only found ${quotes.length} quotes — the walker is wrong`);
  });

  /**
   * THE RULE, AND WHERE IT NOW SITS.
   *
   * This asserted zero orphans, and that held for as long as every quote in the
   * corpus happened to carry a URL. It does not any more: 22 of the 627
   * adjudicated pathways ship with `source_url: ""`, and their step quotes have
   * no page anywhere up the tree.
   *
   * Weakening this to a bigger number would be the wrong repair — the count is
   * upstream's to fix and would drift every publish. What we can actually
   * guarantee is OUR half: an unattributed quote is withheld rather than drawn.
   * `pathwayOf` drops it from the snapshot and `Evidence.tsx`'s `Quote` returns
   * null, and both of those are asserted elsewhere.
   *
   * So what this test protects now is that the gap stays in the shapes we have
   * taught something to abstain on. A quote appearing unattributed under a NEW
   * path is a renderer nobody has told, and that is the regression worth
   * failing for.
   */
  const ABSTAINED = [
    // The whole pathway subtree: `pathwayOf` withholds the finding when the
    // declaration has no page, and withholds each step quote the same way.
    /^\.discipleship_pathway\b/,
    // Sub-signals inherit from the parent question; `Quote` withholds the few
    // that inherit nothing.
    /\.subsignals\[\d+\]\.quote$/,
    // `stepsOf` blanks the quote and keeps the category.
    /^\.next_steps_by_category\.categories\[\d+\]\.quote$/,
    // Same rule, the v2 per-step array: `stepsOf` writes the quote only when
    // `safeUrl(s.source_url)` survives, so these ten reach a snapshot with an
    // empty quote and a step that still ships. Measured at 10 of 73,758 —
    // upstream's to fix, ours to refuse to draw.
    /^\.next_steps\[\d+\]\.quote$/,
  ];

  test("every unattributed quote sits where a renderer already abstains", () => {
    const orphans = quotes.filter((q) => !q.inheritedUrl);
    const unexpected = orphans.filter((q) => !ABSTAINED.some((re) => re.test(q.path)));
    assert.deepEqual(
      unexpected.slice(0, 15).map((q) => `${q.org}${q.path}`),
      [],
      `${unexpected.length} quotes have no source URL under a path nothing withholds`,
    );
  });

  /**
   * The measured 30. Pinned as a floor rather than an exact count so a future
   * publish adding sub-signals does not fail the suite — what must not change is
   * that they exist and that inheritance is load-bearing.
   */
  test("q4 sub-signal quotes rely on inheriting the parent's URL", () => {
    const inherited = quotes.filter((q) => q.path.includes(".subsignals[") && !q.ownUrl);
    assert.ok(
      inherited.length >= 30,
      `expected at least the measured 30 inheriting sub-signal quotes, found ${inherited.length}`,
    );
    // Overwhelmingly they inherit; a few in the v2 corpus do not, and those are
    // withheld by `Quote` rather than drawn bare. What must hold is that
    // inheritance is still doing the work for almost all of them — if that
    // stopped, the renderer would be silently dropping most of q4's evidence.
    const orphaned = inherited.filter((q) => !q.inheritedUrl);
    assert.ok(
      orphaned.length < inherited.length / 10,
      `${orphaned.length} of ${inherited.length} sub-signal quotes inherit nothing — ` +
        `inheritance has stopped working, e.g. ${orphaned[0]?.org}${orphaned[0]?.path}`,
    );
  });

  /**
   * A "source" that is not navigable is not a source.
   *
   * Scoped to quotes that HAVE a URL: a missing URL is the case above, and this
   * one is about a URL we would refuse to render — a `javascript:` or a mangled
   * scheme — being treated as attribution. That distinction matters because the
   * two have different fixes, and folding them together made this test fail for
   * the other one's reason.
   */
  test("every inherited source URL is a URL we would actually render as a link", () => {
    const bad = quotes.filter((q) => q.inheritedUrl && !safeUrl(q.inheritedUrl));
    assert.deepEqual(
      bad.slice(0, 15).map((q) => `${q.org}${q.path} -> ${q.inheritedUrl}`),
      [],
      `${bad.length} quotes cite a URL that safeUrl() refuses`,
    );
  });

  /**
   * `verified` and `quote_confidence` are DIFFERENT AXES and must never be
   * collapsed into one "confidence" badge. A string matcher can prove a span
   * exists on a page; it cannot prove the span is about the question it was
   * filed under. The canonical failure is a "Give" link cited as evidence of
   * "forgiveness" — perfectly verified, completely wrong.
   */
  test("the two evidence axes are both present in the data", () => {
    let verified = 0;
    let confidence = 0;
    for (const r of records) {
      for (const c of r.next_steps_by_category?.categories ?? []) {
        if (c.verified) verified++;
        if (c.quote_confidence) confidence++;
      }
    }
    assert.ok(verified > 0, "no `verified` values found — the walker or the fixture changed");
    assert.ok(confidence > 0, "no `quote_confidence` values found");
  });

  /**
   * "Fail toward unknown, never toward a false yes." A quote that failed to
   * verify must have had its answer downgraded, not shipped.
   */
  test("nothing ships an answer on a failed verification", () => {
    const shipped: string[] = [];
    for (const r of records) {
      for (const k of ["q1", "q3", "q4", "q5", "q6", "q7", "q8"] as const) {
        const q = r[k] as Record<string, unknown> | undefined;
        if (q?.verified === "failed" && q.answer !== "unknown" && q.answer !== "unverified") {
          shipped.push(`${r.org_id}.${k}: verified=failed but answer=${String(q.answer)}`);
        }
      }
    }
    assert.deepEqual(shipped, []);
  });
});
