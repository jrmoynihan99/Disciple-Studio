/**
 * Freezing a church for export.
 *
 * A snapshot is what a person reviews and what (later) goes out, so the failures
 * that matter here are the ones that are invisible on screen: a logo sha taken
 * from the wrong field renders a broken image only for churches whose logo you
 * never looked at; a dropped `slogan_scope` turns "we didn't read the inner
 * pages" into "this church has no slogan" on 83 of 134 churches and looks
 * completely normal while doing it.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { buildSnapshot, buildEntry } from "../snapshot.ts";
import type { ChurchRecord, IndexRow } from "../types.ts";
import { HAVE_FIXTURE, loadIndex, loadRecord, loadEdgeCases } from "./fixture.mts";

const skip = HAVE_FIXTURE ? false : "fixture not present";

/** Every `quote` in a built snapshot, with the sourceUrl sitting beside it. */
function collectQuotes(node: unknown, out: { quote: string; sourceUrl: string }[] = []) {
  if (Array.isArray(node)) {
    node.forEach((v) => collectQuotes(v, out));
    return out;
  }
  if (!node || typeof node !== "object") return out;
  const o = node as Record<string, unknown>;
  if (typeof o.quote === "string" && o.quote.trim()) {
    out.push({ quote: o.quote, sourceUrl: typeof o.sourceUrl === "string" ? o.sourceUrl : "" });
  }
  for (const v of Object.values(o)) collectQuotes(v, out);
  return out;
}

describe("buildSnapshot", { skip }, () => {
  const index = loadIndex();
  const byId = new Map(index.map((r) => [r.id, r]));
  const snaps = index.map((row) => ({ row, snap: buildSnapshot(row, loadRecord(row.id)) }));

  /**
   * The rule from the honesty doc, applied to the copy rather than the original:
   * a quote proves nothing without the page it came from, and "source" printed
   * over a page nobody can open is a lie told by formatting.
   */
  test("every quote in a snapshot carries its own source URL", () => {
    let quotes = 0;
    const orphans: string[] = [];
    for (const { row, snap } of snaps) {
      for (const q of collectQuotes(snap)) {
        quotes++;
        if (!q.sourceUrl) orphans.push(`${row.id}: ${q.quote.slice(0, 40)}`);
      }
    }
    assert.ok(quotes > 300, `expected a corpus of quotes, got ${quotes}`);
    assert.deepEqual(orphans, [], "a quote was copied without the page it came from");
  });

  /**
   * THE DECOY. `record.brand.logo_sha8` is an 8-hex digest of something else and
   * looks exactly like the key you want. The asset route is content-addressed on
   * `IndexRow.lo`, so reaching for the record's hash 404s every card — and only
   * for churches that HAVE a logo, which is the 97% you would not think to check.
   */
  test("the logo sha comes from the index row, never from brand.logo_sha8", () => {
    let withLogo = 0;
    for (const { row, snap } of snaps) {
      if (!row.lo || !row.lx) {
        assert.equal(snap.logo, null, `${row.id}: logo claimed without an index sha`);
        assert.ok(snap.noLogo, `${row.id}: neither a logo nor a reason for its absence`);
        continue;
      }
      withLogo++;
      assert.equal(snap.logo?.sha, row.lo);
      assert.equal(snap.logo?.sha.length, 64, `${row.id}: that is not the content sha`);
    }
    assert.ok(withLogo > 100, `expected most churches to have a logo, got ${withLogo}`);

    const row = byId.get("abernethymmc_org");
    if (row) {
      const rec = loadRecord("abernethymmc_org");
      const snap = buildSnapshot(row, rec);
      const decoy = (rec.brand as Record<string, unknown>)?.logo_sha8;
      assert.equal(snap.logo?.sha, row.lo);
      assert.notEqual(snap.logo?.sha, decoy, "the snapshot took the decoy hash");
    }
  });

  /** The plate depends on it, and a near-white cut-out with no plate is invisible. */
  test("the logo theme survives into the snapshot", () => {
    for (const { row, snap } of snaps) {
      if (snap.logo) assert.equal(snap.logo.theme, row.lt ?? "");
    }
  });

  /**
   * Three states, not two. Measured on this corpus: 51 churches have a slogan
   * (scope ""), 83 have no slogan but scope "homepage_only" — meaning the inner
   * pages were never read. Collapsing those two asserts absence for 83 churches.
   */
  test("the slogan keeps its scope even when the text is empty", () => {
    let withText = 0;
    let homepageOnly = 0;
    for (const { snap } of snaps) {
      if (snap.slogan.text) withText++;
      else if (snap.slogan.scope) homepageOnly++;
    }
    assert.equal(withText, 51);
    assert.equal(homepageOnly, 83);
    assert.equal(withText + homepageOnly, snaps.length, "a slogan state went missing");
  });

  /**
   * A churning id makes every revert a silent no-op: the edit stays in the blob
   * keyed to an id nothing renders any more, the card looks unedited, and the
   * "edited" count is wrong forever.
   */
  test("item ids are stable across builds and unique within a church", () => {
    for (const { row } of snaps.slice(0, 25)) {
      const rec = loadRecord(row.id);
      const a = buildSnapshot(row, rec);
      const b = buildSnapshot(row, rec);
      const ids = (s: typeof a) => [
        ...s.steps.map((x) => x.id),
        ...s.pathway.steps.map((x) => x.id),
        ...s.contacts.map((x) => x.id),
      ];
      assert.deepEqual(ids(a), ids(b), `${row.id}: ids are not stable`);
      assert.equal(new Set(ids(a)).size, ids(a).length, `${row.id}: duplicate item id`);
    }
  });

  /**
   * The roster runs to 102 entries on one church and is the largest single size
   * driver. It is reference material for the dossier, not something you put in
   * front of a church — and a group blob has a hard 4 MB ceiling.
   */
  test("the staff roster is not snapshotted, and no card is oversized", () => {
    let biggest = 0;
    let biggestId = "";
    for (const { row, snap } of snaps) {
      const json = JSON.stringify(snap);
      assert.ok(!json.includes('"roster"'), `${row.id}: the roster came along`);
      if (json.length > biggest) {
        biggest = json.length;
        biggestId = row.id;
      }
    }
    assert.ok(biggest < 8_000, `${biggestId} snapshot is ${biggest} B — over the 8 KB tripwire`);
  });

  /**
   * Pins the real state of INDEX-CONTRACT §3.1: the ordered pathway is a forward
   * contract with no data behind it, while q1 carries a genuine cited finding on
   * more than half the corpus. When a publish finally lands the steps, this test
   * fails loudly and whoever sees it goes and reads §3.1 — which is the point.
   */
  test("no church has ordered pathway steps yet, but 76 carry a cited finding", () => {
    let withSteps = 0;
    let withFinding = 0;
    for (const { snap } of snaps) {
      if (snap.pathway.steps.length) withSteps++;
      if (snap.pathway.finding) withFinding++;
    }
    assert.equal(withSteps, 0, "§3.1 pathway data has arrived — go and read the contract");
    assert.equal(withFinding, 76);
  });

  /** A finding we cannot link is not a finding we may quote. */
  test("a finding always has both a quote and a source URL", () => {
    for (const { row, snap } of snaps) {
      const f = snap.pathway.finding;
      if (!f) continue;
      assert.ok(f.quote.trim(), `${row.id}: finding with no quote`);
      assert.ok(f.sourceUrl, `${row.id}: finding with no source`);
    }
  });

  test("buildEntry keys staleness on the record sha, not the publish id", () => {
    const row = index[0];
    const entry = buildEntry(row, loadRecord(row.id), "fixture-123", 1000);
    assert.equal(entry.rec, row.rec);
    assert.equal(entry.publishId, "fixture-123");
    assert.equal(entry.orgId, row.id);
    assert.deepEqual(entry.edits, { fields: {}, suppressed: {}, added: [] });
  });
});

describe("buildSnapshot refuses what must never be exported", { skip }, () => {
  /**
   * The 10 edge-case records are fabricated. `/api/leads/church/[id]` already
   * 404s them; the snapshot builder refuses them too, because a group is the one
   * artifact that leaves the building.
   */
  test("every synthetic record is refused", () => {
    const cases = loadEdgeCases();
    const ids = Object.keys(cases);
    assert.ok(ids.length >= 10, `expected the edge-case records, found ${ids.length}`);
    for (const id of ids) {
      const rec = cases[id];
      assert.ok(rec._synthetic, `${id}: an edge-case record lost its _synthetic marker`);
      assert.throws(
        () => buildSnapshot({ id } as IndexRow, rec),
        /synthetic/i,
        `${id} was snapshotted`,
      );
    }
  });
});

describe("buildSnapshot sanitises hostile input", () => {
  // Not a fixture record: the fixture's hostile church is synthetic and so is
  // refused outright, which would leave the sanitising itself untested.
  const hostile: ChurchRecord = {
    org_id: "hostile_test",
    name: "Hostile <script>alert(1)</script> Church",
    own_url: "javascript:alert(1)",
    church_url: "javascript:alert(2)",
    q1: {
      answer: "yes",
      quote: "Follow our path",
      source_url: "javascript:alert(3)",
      verified: "exact",
    },
    brand: { slogan: "We &amp; you", logo_url: "javascript:alert(4)" },
    next_steps_by_category: {
      looked: true,
      categories: [
        {
          key: "connect",
          label: "Connect",
          state: "present",
          own_terms: ["Visit"],
          quote: "Come and see",
          source_url: "javascript:alert(5)",
          verified: "exact",
        },
      ],
    },
    contact: {
      phone: "+1 555",
      social: { facebook: "javascript:alert(6)" },
      recommended: [{ name: "A Person", email: "Email A Person" }],
    },
  } as unknown as ChurchRecord;

  const snap = buildSnapshot({ id: "hostile_test" } as IndexRow, hostile);

  test("no javascript: URL survives anywhere", () => {
    assert.ok(!JSON.stringify(snap).toLowerCase().includes("javascript:"));
    assert.equal(snap.churchUrl, "");
    assert.equal(snap.steps[0].sourceUrl, "");
  });

  test("a quote whose source was refused loses the finding rather than the URL", () => {
    // q1's source_url was hostile, so there is no page to point at — and a quote
    // without a page is not one we may print as the church's words.
    assert.equal(snap.pathway.finding, null);
  });

  test("markup survives as literal text, never as markup", () => {
    assert.ok(snap.name.includes("<script>"), "the text was mangled instead of escaped");
    assert.equal(snap.slogan.text, "We & you", "entities were not decoded");
  });

  test("a link's label is not accepted as an email address", () => {
    assert.equal(snap.contacts.find((c) => c.name === "A Person")?.email, "");
  });
});
