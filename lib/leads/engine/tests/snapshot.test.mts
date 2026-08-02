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

import { buildSnapshot, buildEntry, pathwayOf } from "../snapshot.ts";
import { pathwayIsOrdered, pathwayKnowledge } from "../group-types.ts";
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
   * Three states, not two: a slogan, or no slogan with a scope saying the inner
   * pages were never read. Collapsing those two asserts an absence nobody
   * measured, for whichever churches are in the second group.
   *
   * The counts used to be pinned. What survives a republish is that both states
   * still occur and that every church lands in one of them — a church in
   * neither has lost its scope, which is the collapse this exists to catch.
   */
  test("the slogan keeps its scope even when the text is empty", () => {
    let withText = 0;
    let homepageOnly = 0;
    for (const { snap } of snaps) {
      if (snap.slogan.text) withText++;
      else if (snap.slogan.scope) homepageOnly++;
    }
    assert.ok(withText > 0, "no church has a slogan — the field stopped being read");
    assert.ok(homepageOnly > 0, "no church carries a bare scope — the third state has collapsed");
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
   * THE WHOLE CORPUS, because the id scheme changed shape.
   *
   * v1 built one step per category out of a fixed eight, so uniqueness was free.
   * v2 reads `next_steps[]`, where a church can carry several steps in one
   * category — 29 of them on `growwithsecond_org` — and `rank` cannot be the key
   * either, since 2,226 records repeat one. So ids are `s_<category>` with an
   * occurrence suffix, and "unique" stopped being structural and became something
   * to prove. Twenty-five churches is not proof; every church is.
   */
  test("no church anywhere produces a duplicate step id", () => {
    const bad: string[] = [];
    for (const { row, snap } of snaps) {
      const ids = snap.steps.map((s) => s.id);
      if (new Set(ids).size !== ids.length) bad.push(row.id);
    }
    assert.deepEqual(bad.slice(0, 15), [], `${bad.length} churches have a duplicate step id`);
  });

  /**
   * SIXTEEN PERCENT OF EVERY STEP LIST IS OURS, NOT THE CHURCH'S.
   *
   * The corpus fabricates an "Attend a Worship Service" row on every church. It
   * has no name of its own, no quote and no source URL, so nothing else about it
   * distinguishes it from a step we read off their site — the flag is the only
   * carrier, and if it stops reaching the snapshot the review page starts
   * presenting our invention as their offering with no way to tell.
   */
  test("a fabricated step is marked as one, and carries no quote", () => {
    let generated = 0;
    const spoke: string[] = [];
    for (const { row, snap } of snaps) {
      for (const s of snap.steps) {
        if (!s.generated) continue;
        generated++;
        if (s.quote || s.sourceUrl || s.ownName) spoke.push(`${row.id}/${s.id}`);
      }
    }
    assert.ok(generated > 10_000, `only ${generated} fabricated steps — the flag stopped arriving`);
    assert.deepEqual(
      spoke.slice(0, 10),
      [],
      `${spoke.length} fabricated steps claim words we did not find`,
    );
  });

  /**
   * The title is the decision the pipeline already made, not one we re-make. If
   * `final_name` ever failed to reach `label`, the card would fall back to
   * whatever else was lying around and nobody would see the difference until a
   * church read its own demo.
   */
  test("the step title is the pipeline's decision, and is never empty", () => {
    const blank: string[] = [];
    let fromRecord = 0;
    for (const { row, snap } of snaps) {
      const want = (loadRecord(row.id).next_steps ?? []).map((s) => (s.final_name ?? "").trim());
      if (want.length !== snap.steps.length) continue; // the two legacy-path records
      snap.steps.forEach((s, i) => {
        if (!s.label.trim()) blank.push(`${row.id}/${s.id}`);
        else if (s.label === want[i]) fromRecord++;
      });
    }
    assert.deepEqual(blank.slice(0, 10), [], `${blank.length} steps have no title`);
    assert.ok(fromRecord > 70_000, `only ${fromRecord} titles came from final_name`);
  });

  /**
   * The roster runs to 102 entries on one church and is the largest single size
   * driver. It is reference material for the dossier, not something you put in
   * front of a church — and a group blob has a hard 4 MB ceiling.
   *
   * The ceiling moved from 8 KB to 12 KB when the adjudicated pathway landed: a
   * church with ten cited steps is legitimately bigger than one with none, and
   * the largest in the corpus is now ~8.8 KB. The tripwire is not a budget — at
   * 12 KB a twenty-church batch is ~240 KB against a 4 MB limit — it is a guard
   * against something UNBOUNDED slipping in, which is what the roster would be.
   * So it is raised to clear real content and no further.
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
    assert.ok(biggest < 12_000, `${biggestId} snapshot is ${biggest} B — over the 12 KB tripwire`);
  });

  /**
   * The pathway data has arrived, and this is what replaces the tripwire that
   * said it had not. It used to assert `withSteps === 0` precisely so that the
   * publish landing the steps would fail the build rather than pass silently —
   * which is what happened.
   *
   * WHAT IT CHECKS NOW IS THE CONTRACT, NOT THE COUNT: the pipeline writes the
   * pathway only when at least two steps survive verification, so a present
   * pathway is complete and an absent one carries a status saying which absence
   * it is. Those two facts are what every surface downstream leans on.
   */
  test("a pathway is either complete or absent-with-a-reason, never half-built", () => {
    let withSteps = 0;
    const thin: string[] = [];
    const silent: string[] = [];
    for (const { row, snap } of snaps) {
      const p = snap.pathway;
      if (p.present) {
        withSteps++;
        if (p.steps.length < 2) thin.push(`${row.id}: ${p.steps.length} step(s)`);
      } else if (!p.status) {
        silent.push(row.id);
      }
    }
    assert.ok(withSteps > 0, "no church has a pathway — has the key moved again?");
    assert.deepEqual(thin.slice(0, 10), [], `${thin.length} pathways ship with fewer than 2 steps`);
    assert.deepEqual(
      silent.slice(0, 10),
      [],
      `${silent.length} churches have neither a pathway nor a status — they would read ` +
        `"not checked" without anything saying so`,
    );
  });

  /**
   * The retired scalar, guarded.
   *
   * `next_steps_by_category.pathway_name` is an observation, not proof of a
   * pathway — `01-DOMAIN.md` says so and says it is dropped from the export for
   * that reason. `pathwayOf` used to fall back to it, which would name a pathway
   * for every church carrying the scalar while having none. That is 853 invented
   * journeys, and each one would read as a finding.
   */
  test("the retired pathway_name scalar never produces a pathway", () => {
    const invented: string[] = [];
    for (const { row } of snaps) {
      const rec = loadRecord(row.id) as unknown as Record<string, unknown>;
      if (rec.discipleship_pathway) continue;
      const nsc = rec.next_steps_by_category as { pathway_name?: string } | undefined;
      if (!nsc?.pathway_name) continue;
      const p = buildSnapshot(row, loadRecord(row.id)).pathway;
      if (p.present || p.name || p.steps.length) invented.push(`${row.id}: "${p.name}"`);
    }
    assert.deepEqual(
      invented.slice(0, 10),
      [],
      `${invented.length} churches got a pathway from the retired scalar`,
    );
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

/**
 * The discipleship pathway, as the console's dossier reads it.
 *
 * NOT FIXTURE-DRIVEN, and it cannot be: `q1.pathway_steps` is unpopulated on all
 * 134 records in the current dataset, so a fixture test here would assert an
 * empty array and pass forever without ever exercising a step. The records below
 * carry the shape the newer pipeline emits (`discipleship_pathway_steps_json`),
 * copied field for field.
 *
 * What is actually at stake is the numbering. `page_order` means "these headings
 * appeared in this order in the HTML" and `explicit_sequenced` means "the church
 * said do this, then this". Printing 1..4 for the first turns a fact about our
 * scraper into a claim about the church — and it is a claim that gets quoted
 * back at you in a reply to a cold email.
 */
describe("the discipleship pathway", () => {
  /**
   * Built against `discipleship_pathway`, the adjudicated shape the pipeline
   * actually ships — `order`/`name`/`name_verified`, not the retired flat
   * `q1.pathway_steps` with `ordinal`/`label`/`label_verified` these tests were
   * first written for. A fixture that models a shape nobody sends proves the
   * mapper handles imaginary data.
   */
  const withSteps = (basis: string | undefined, extra: Record<string, unknown> = {}) =>
    ({
      org_id: "pathway_test",
      discipleship_pathway: {
        name: "First Steps",
        name_confidence: "high",
        declaration_quote: "Here is how we help you grow:",
        purpose: "discipleship",
        ordered: basis === "explicit_numbered" || basis === "explicit_sequenced",
        order_basis: basis,
        source_url: "https://example.org/im-new",
        step_count: 2,
        steps: [
          {
            order: 1,
            name: "Attend a Sunday gathering",
            category: null,
            category_raw: "visit",
            quote: "You're invited to worship with us!",
            source_url: "https://example.org/im-new",
            verified: "exact",
            name_verified: "exact",
          },
          {
            order: 2,
            name: "Fill out a welcome card",
            category: "connect",
            category_raw: "connect",
            quote: "",
            source_url: "https://example.org/im-new",
            verified: "",
            name_verified: "exact",
          },
        ],
        ...extra,
      },
    }) as unknown as ChurchRecord;

  test("the step names come through in the church's own words", () => {
    const p = pathwayOf(withSteps("explicit_sequenced"));
    assert.deepEqual(
      p.steps.map((s) => s.label),
      ["Attend a Sunday gathering", "Fill out a welcome card"],
    );
    assert.equal(p.name, "First Steps");
  });

  test("only an explicit basis licenses printing a number", () => {
    assert.equal(pathwayIsOrdered("explicit_numbered"), true);
    assert.equal(pathwayIsOrdered("explicit_sequenced"), true);
    assert.equal(
      pathwayIsOrdered("page_order"),
      false,
      "DOM order is our scraper's fact, not the church's claim",
    );
    assert.equal(pathwayIsOrdered(null), false, "no stated basis is not a basis");
    assert.equal(pathwayIsOrdered(undefined), false);
  });

  test("an unrecognised basis is refused rather than trusted", () => {
    assert.equal(pathwayOf(withSteps("vibes")).orderBasis, null);
    assert.equal(pathwayIsOrdered(pathwayOf(withSteps("vibes")).orderBasis), false);
    assert.equal(pathwayOf(withSteps(undefined)).orderBasis, null);
  });

  /**
   * The dossier and the batch review card must not disagree about whether a
   * church stated an order. They read the same record through the same two
   * functions precisely so they cannot.
   */
  test("ordinals are kept as the page gave them, never renumbered by position", () => {
    const gappy = withSteps("explicit_numbered", {
      steps: [
        { order: 2, name: "Second" },
        { order: 5, name: "Fifth" },
      ],
    });
    assert.deepEqual(
      pathwayOf(gappy).steps.map((s) => s.ordinal),
      [2, 5],
      "a gap in the church's own numbering is theirs to have",
    );
  });

  test("a step with no ordinal falls back to its position, and ids stay unique", () => {
    const noOrdinals = withSteps("page_order", {
      steps: [{ name: "One" }, { name: "Two" }, { name: "Three" }],
    });
    const p = pathwayOf(noOrdinals);
    assert.deepEqual(p.steps.map((s) => s.ordinal), [1, 2, 3]);
    assert.equal(new Set(p.steps.map((s) => s.id)).size, 3, "duplicate ids would collide on edit");
  });

  /**
   * THE 853, GUARDED AT THE UNIT LEVEL.
   *
   * `pathwayOf` used to fall back to `next_steps_by_category.pathway_name`, and
   * a test asserted that fallback as a feature. `01-DOMAIN.md` calls the field a
   * scalar observation that is "NOT proof of a pathway" and drops it from the
   * export for exactly that reason, so the old test was pinning a bug. 853
   * churches in the corpus carry the scalar and have no pathway; the fallback
   * would have named a journey for every one of them.
   */
  test("the retired pathway_name scalar produces nothing", () => {
    const alt = {
      org_id: "x",
      next_steps_by_category: { pathway_name: "ABCD" },
    } as unknown as ChurchRecord;
    const p = pathwayOf(alt);
    assert.equal(p.name, "", "an observation was promoted to a pathway name");
    assert.equal(p.present, false);
    assert.deepEqual(p.steps, []);
  });

  test("a church with nothing has an empty pathway, not a thrown error", () => {
    const p = pathwayOf({ org_id: "x" } as unknown as ChurchRecord);
    assert.deepEqual(p.steps, []);
    assert.equal(p.name, "");
    assert.equal(p.finding, null);
    assert.equal(p.present, false);
  });

  /**
   * The three states, at the boundary. Two of these absences look identical in
   * the data — no pathway key — and only `status` tells them apart.
   */
  test("which absence it is comes from the status, never from the step count", () => {
    const withStatus = (s: string) =>
      pathwayKnowledge({
        present: false,
        stepCount: 0,
        status: s,
      });
    assert.equal(withStatus("model_says_no"), "none", "a measured negative");
    assert.equal(
      withStatus("no_declaration_candidate"),
      "unknown",
      "the largest bucket — we never looked, and must not say 'none'",
    );
    assert.equal(withStatus("fewer_than_2_valid_steps"), "unknown");
    assert.equal(withStatus("steps_not_in_headings"), "unknown");
    assert.equal(withStatus(""), "unknown", "no status at all is not a negative");
    assert.equal(pathwayKnowledge({ present: true, stepCount: 4 }), "has");
  });

  test("a hostile step URL does not survive into a rendered link", () => {
    const nasty = withSteps("explicit_numbered", {
      source_url: "",
      steps: [{ order: 1, name: "Click me", quote: "Come", source_url: "javascript:alert(1)" }],
    });
    assert.equal(pathwayOf(nasty).steps[0].sourceUrl, "");
    assert.ok(!JSON.stringify(pathwayOf(nasty)).toLowerCase().includes("javascript:"));
  });

  /**
   * The 22 pathways with `source_url: ""`, at the unit level. Their step quotes
   * have no page anywhere up the tree, and a quote without its page is the one
   * thing the evidence rules forbid shipping. The STEP survives — its name is
   * adjudicated, not quoted.
   */
  test("a step quote with no page anywhere is withheld, but the step remains", () => {
    const unsourced = withSteps("explicit_sequenced", {
      source_url: "",
      steps: [{ order: 1, name: "Belong", quote: "Come and see", source_url: "" }],
    });
    const p = pathwayOf(unsourced);
    assert.equal(p.steps.length, 1, "the step itself must survive");
    assert.equal(p.steps[0].label, "Belong");
    assert.equal(p.steps[0].quote, "", "an unattributable quote was kept");
    assert.equal(p.steps[0].sourceUrl, "");
    assert.equal(p.finding, null, "the declaration has no page either");
  });

  test("a step quote inherits the pathway's page when it has none of its own", () => {
    const p = pathwayOf(
      withSteps("explicit_sequenced", {
        steps: [{ order: 1, name: "Belong", quote: "Come and see", source_url: "" }],
      }),
    );
    assert.equal(p.steps[0].quote, "Come and see");
    assert.equal(p.steps[0].sourceUrl, "https://example.org/im-new");
  });
});
