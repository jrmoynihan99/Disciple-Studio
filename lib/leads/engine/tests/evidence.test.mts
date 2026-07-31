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
    assert.equal(records.length, 134);
    assert.ok(quotes.length > 500, `only found ${quotes.length} quotes — the walker is wrong`);
  });

  /** THE RULE. */
  test("every quote is traceable to a URL on itself or an ancestor", () => {
    const orphans = quotes.filter((q) => !q.inheritedUrl);
    assert.deepEqual(
      orphans.slice(0, 15).map((q) => `${q.org}${q.path}`),
      [],
      `${orphans.length} quotes have no source URL anywhere up the tree`,
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
    for (const q of inherited) {
      assert.ok(
        q.inheritedUrl,
        `${q.org}${q.path} must inherit a URL from its parent question`,
      );
    }
  });

  /** A "source" that is not navigable is not a source. */
  test("every inherited source URL is a URL we would actually render as a link", () => {
    const bad = quotes.filter((q) => !safeUrl(q.inheritedUrl));
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
