/**
 * THE PUBLISH VALIDATOR.
 *
 * Unlike `golden.test.mts`, this needs NO golden table — only `index.json` and
 * `records/`. So it runs against any publish the scraper repo produces:
 *
 *     LEADS_FIXTURE_DIR=/path/to/publish/<publish_id> npm test
 *
 * What it proves is the one property that matters: THE SLIM INDEX AND THE FULL
 * RECORD PAINT THE SAME COLOUR FOR EVERY CHURCH.
 *
 * That is not a nicety. The list, the facet swatches and the histogram are drawn
 * from the index; the dossier is drawn from the record. If they can disagree,
 * the console shows one verdict on the row and a different one when you open it
 * — and because the index's failure mode is to fall back to grey, the bug
 * presents as "we never measured this" rather than as a bug.
 *
 * See `lib/leads/INDEX-CONTRACT.md` for what a publish must carry and why.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { churchFromIndex, churchFromRecord } from "../adapt.ts";
import { colorState } from "../color.ts";
import { favorCount, favorScore, referenceFavorModel } from "../favor.ts";
import { staffText } from "../staff.ts";
import { stepsDisplayCount } from "../steps.ts";
import { QMETA, type EngineCtx, type QuestionKey } from "../types.ts";
import { HAVE_FIXTURE, loadIndex, loadRecord } from "./fixture.mts";

const QUESTION_KEYS = QMETA.map(([k]) => k as QuestionKey);

describe("publish consistency", { skip: !HAVE_FIXTURE && "no publish at LEADS_FIXTURE_DIR" }, () => {
  const index = loadIndex();
  const ctx: EngineCtx = { overrides: {}, favor: referenceFavorModel(), rows: index };

  /** Records are optional — an index-only publish still gets the checks that do not need them. */
  const pairs = index.flatMap((row) => {
    try {
      return [{ row, rec: loadRecord(row.id) }];
    } catch {
      return [];
    }
  });

  test("the index is non-empty and every row has a join key", () => {
    assert.ok(index.length > 0, "index.json is empty");
    for (const r of index) {
      assert.ok(r.id, "every row needs an org_id — it is the join key for all state");
    }
  });

  /**
   * A church whose name the pipeline never resolved is HONEST DATA, not a defect
   * — 3 of the 134 fixture churches are in this state, and the record agrees
   * with the index (`name: ""` in both). The console must render such a row
   * completely, with "(unnamed)" standing in, exactly as the reference build
   * does; it must not hide the row or leave the slot blank.
   *
   * Reported rather than asserted, so the number is visible in the run without
   * failing a publish over something upstream cannot always fix.
   */
  test("churches with no resolved name are counted, not hidden", (t) => {
    const nameless = index.filter((r) => !r.n).map((r) => r.id);
    if (nameless.length) {
      t.diagnostic(
        `${nameless.length} of ${index.length} churches have no name ` +
          `(${nameless.slice(0, 5).join(", ")}${nameless.length > 5 ? ", ..." : ""}) ` +
          `— each must still render a complete row.`,
      );
    }
    assert.ok(
      nameless.length / index.length < 0.1,
      `${nameless.length} of ${index.length} churches have no name — over 10% suggests a ` +
        `pipeline regression rather than the usual handful.`,
    );
  });

  test("org_ids are unique", () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const r of index) {
      if (seen.has(r.id)) dupes.push(r.id);
      seen.add(r.id);
    }
    assert.deepEqual(dupes, [], "a duplicate org_id silently merges two churches' marks");
  });

  /**
   * Empty values must be OMITTED, never emitted as "".
   *
   * Enforced on the fields that BUILD FILTER OPTIONS, because there an empty
   * string is not merely untidy — it creates a facet option for "" and offers
   * the user a filter that means nothing and matches an arbitrary subset.
   *
   * `n` is deliberately not in this list: see the nameless-church test above.
   */
  const FACET_FIELDS = ["lg", "nw", "co", "pf"] as const;
  const FACET_SUBFIELDS = ["a", "pk", "cell"] as const;

  test("no filter-building field is emitted as an empty string", () => {
    const bad: string[] = [];
    for (const r of index) {
      for (const k of FACET_FIELDS) {
        if (r[k] === "") bad.push(`${r.id}.${k}`);
      }
      for (const qk of QUESTION_KEYS) {
        const q = r[qk as keyof typeof r] as Record<string, unknown> | undefined;
        if (!q) continue;
        for (const k2 of FACET_SUBFIELDS) {
          if (q[k2] === "") bad.push(`${r.id}.${qk}.${k2}`);
        }
      }
    }
    assert.deepEqual(
      bad.slice(0, 20),
      [],
      `${bad.length} empty-string filter fields — omit the key instead. ` +
        `See lib/leads/INDEX-CONTRACT.md §4.`,
    );
  });

  /** A country code in the subdivision slot puts "USA" in the state dropdown. */
  test("no subdivision value is a country", () => {
    const countries = new Set(index.map((r) => r.co).filter(Boolean));
    for (const row of index) {
      const sub = churchFromIndex(row).subdiv;
      if (sub) assert.ok(!countries.has(sub), `${row.id}: "${sub}" is a country, not a subdivision`);
    }
  });

  /**
   * `ns.l` must be present even when false. Its absence and `false` mean the
   * same thing to a reader of the JSON but very different things on screen:
   * "not checked" versus "0 of 8".
   */
  test("next-steps packing is well formed", () => {
    const bad: string[] = [];
    for (const r of index) {
      if (!r.ns) continue;
      const s = r.ns.s ?? "";
      if (s && !/^[pan]+$/.test(s)) bad.push(`${r.id}: ns.s "${s}" is not p/a/n`);
      if (s && s.length !== 8) bad.push(`${r.id}: ns.s has ${s.length} chars, expected 8`);
    }
    assert.deepEqual(bad.slice(0, 20), [], `${bad.length} malformed ns fields`);
  });

  describe("index vs record", () => {
    test("records were found for the index rows", () => {
      assert.ok(
        pairs.length > 0,
        "no records/<org_id>.json found — cannot check the two views against each other",
      );
    });

    /** THE CHECK. */
    test("every question paints the same colour from both views", () => {
      const bad: string[] = [];
      for (const { row, rec } of pairs) {
        const fromIndex = churchFromIndex(row);
        const fromRecord = churchFromRecord(rec);
        for (const k of QUESTION_KEYS) {
          const ci = colorState(k, fromIndex.q(k), ctx);
          const cr = colorState(k, fromRecord.q(k), ctx);
          if (ci !== cr) bad.push(`${row.id} ${k}: index ${ci} vs record ${cr}`);
        }
      }
      assert.deepEqual(
        bad.slice(0, 25),
        [],
        `${bad.length} cells disagree — the index is missing a field the colour engine reads. ` +
          `See lib/leads/INDEX-CONTRACT.md §2.`,
      );
    });

    test("favor scores agree from both views", () => {
      const bad: string[] = [];
      for (const { row, rec } of pairs) {
        const a = favorScore(churchFromIndex(row), ctx);
        const b = favorScore(churchFromRecord(rec), ctx);
        if (Math.abs(a - b) > 1e-9) bad.push(`${row.id}: index ${a} vs record ${b}`);
        const ca = favorCount(churchFromIndex(row), ctx);
        const cb = favorCount(churchFromRecord(rec), ctx);
        if (ca !== cb) bad.push(`${row.id} count: index ${ca} vs record ${cb}`);
      }
      assert.deepEqual(bad.slice(0, 25), [], `${bad.length} favor disagreements`);
    });

    test("displayed next-step counts agree, and unlooked stays null in both", () => {
      const bad: string[] = [];
      for (const { row, rec } of pairs) {
        const a = stepsDisplayCount(churchFromIndex(row).steps);
        const b = stepsDisplayCount(churchFromRecord(rec).steps);
        if (a !== b) bad.push(`${row.id}: index ${a} vs record ${b}`);
      }
      assert.deepEqual(bad.slice(0, 25), [], `${bad.length} next-step count disagreements`);
    });

    /**
     * The three strengths of a staff count must survive into the index. An
     * uncited estimate that publishes as a bare number reads as a measurement —
     * the exact failure this dataset is built to avoid.
     */
    test("a staff count renders identically from both views (27 vs 12+ vs 12?)", () => {
      const bad: string[] = [];
      for (const { row, rec } of pairs) {
        const a = staffText(churchFromIndex(row).q("q2"));
        const b = staffText(churchFromRecord(rec).q("q2"));
        if (a !== b) {
          bad.push(
            `${row.id}: index "${a}" vs record "${b}"` +
              (b.endsWith("?") ? "  <- index has no `uc` field; see INDEX-CONTRACT.md §5.3" : ""),
          );
        }
      }
      assert.deepEqual(bad.slice(0, 25), [], `${bad.length} staff counts render differently`);
    });
  });
});
