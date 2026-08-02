/**
 * The two facets over one field, and the names that were missing from it.
 *
 * `pf` is the only fact the console records about what software a church already
 * runs — the thing a Disciple Studio pitch would sit next to or replace — and it
 * reached no filter at all. Two things had to be true before it could:
 *
 *  1. Every value needs a NAME. `VOCAB.BACKEND_NAME` covers 7 of 19, and the
 *     other 12 rendered as nothing at all rather than as a key.
 *  2. `pf` is not a ChMS field. It is "the backend we detected", and the values
 *     are church management systems, giving processors, media libraries and SMS
 *     tools mixed together. One "ChMS" filter over all of them would tell a
 *     salesperson that 517 churches run a video library as their ChMS.
 *
 * A vendor selling both halves appears in BOTH facets, so neither list is the
 * complement of the other and neither may be derived by subtracting.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { BACKEND_KINDS, backendIsKind, backendName } from "../backend.ts";
import { churchFromIndex, churchFromRecord } from "../adapt.ts";
import { facetVal } from "../filter.ts";
import { HAVE_FIXTURE, loadIndex, loadRecord } from "./fixture.mts";
import type { IndexRow } from "../types.ts";

describe("backend naming", () => {
  test("every classified backend has a display name", () => {
    const nameless = Object.keys(BACKEND_KINDS).filter((k) => !backendName(k));
    assert.deepEqual(
      nameless,
      [],
      "a backend we classify but cannot name would filter to a blank dropdown row",
    );
  });

  test("absence and `unknown` are not vendors", () => {
    assert.equal(backendName(""), "");
    assert.equal(backendName(undefined), "");
    // 1,359 churches carry it. Left as a value it would sit in the dropdown as
    // though "Unknown" were a product you could filter customers by.
    assert.equal(backendName("unknown"), "");
    assert.equal(backendIsKind("unknown", "chms"), false);
    assert.equal(backendIsKind("unknown", "tooling"), false);
  });

  test("a vendor selling both halves is in both facets", () => {
    for (const k of ["tithely", "subsplash", "ministrybrands", "faithlife"]) {
      assert.ok(backendIsKind(k, "chms"), `${k} should be a ChMS`);
      assert.ok(backendIsKind(k, "tooling"), `${k} should be tooling`);
    }
  });

  test("a giving or media vendor is never offered as a ChMS", () => {
    for (const k of ["givelify", "vanco", "rightnowmedia", "clearstream", "textinchurch", "pushpay"]) {
      assert.equal(backendIsKind(k, "chms"), false, `${k} is not a church management system`);
      assert.ok(backendIsKind(k, "tooling"), `${k} should be tooling`);
    }
  });

  test("every kind list is non-empty and uses only the two known kinds", () => {
    for (const [k, kinds] of Object.entries(BACKEND_KINDS)) {
      assert.ok(kinds.length > 0, `${k} is classified as nothing`);
      for (const kind of kinds) {
        assert.ok(kind === "chms" || kind === "tooling", `${k} has unknown kind ${kind}`);
      }
    }
  });
});

describe("backend facets over the corpus", { skip: !HAVE_FIXTURE && "fixture not present" }, () => {
  const index = loadIndex();

  /**
   * The classification must cover what the corpus actually contains. An
   * unclassified value does not throw — it silently returns "" from both
   * facets, so those churches quietly become unfilterable and nobody is told.
   */
  test("every backend the corpus ships is classified", () => {
    const seen = new Map<string, number>();
    for (const r of index) {
      const p = (r.pf ?? "").toLowerCase();
      if (!p || p === "unknown") continue;
      seen.set(p, (seen.get(p) ?? 0) + 1);
    }
    const unclassified = [...seen].filter(([k]) => !BACKEND_KINDS[k]);
    assert.deepEqual(
      unclassified.map(([k, n]) => `${k} (${n} churches)`),
      [],
      "unclassified backends fall out of BOTH facets without saying so",
    );
    assert.ok(seen.size > 5, "the corpus should carry a range of backends");
  });

  test("both facets are populated, and their union is every classified church", () => {
    let chms = 0;
    let tooling = 0;
    let either = 0;
    let both = 0;
    for (const r of index) {
      const v = churchFromIndex(r);
      const c = facetVal("chms", v);
      const t = facetVal("tooling", v);
      if (c) chms++;
      if (t) tooling++;
      if (c || t) either++;
      if (c && t) both++;
    }
    assert.ok(chms > 0 && tooling > 0, "a facet with no values would render an empty dropdown");
    assert.ok(both > 0, "no vendor is dual-listed — the both-halves rule is not being applied");
    assert.equal(
      chms + tooling - both,
      either,
      "inclusion-exclusion fails, so the two lists are not two views of one field",
    );
  });

  test("a facet value is always the backend key itself, never a name", () => {
    for (const r of index.slice(0, 500)) {
      const v = churchFromIndex(r);
      for (const key of ["chms", "tooling"] as const) {
        const val = facetVal(key, v);
        if (!val) continue;
        assert.equal(val, (r.pf ?? "").toLowerCase(), `${r.id}: ${key} facet value is not the key`);
      }
    }
  });

  /**
   * The list filters from the index and the dossier reads the record. A backend
   * that projects differently would filter a church into a group whose dossier
   * then names a different platform.
   */
  test("the two projections agree about the backend", () => {
    const bad: string[] = [];
    for (const r of index.slice(0, 1500)) {
      const a = churchFromIndex(r as IndexRow).backend;
      const b = churchFromRecord(loadRecord(r.id)).backend;
      if (a !== b) bad.push(`${r.id}: index ${a || "(none)"} vs record ${b || "(none)"}`);
    }
    assert.deepEqual(bad.slice(0, 10), [], `${bad.length} churches project a different backend`);
  });
});
