/**
 * The edit algebra, and the one rule it exists to enforce.
 *
 * A person fixing a typo in a quote has, without meaning to, destroyed a claim:
 * the text is no longer what the page says, so the citation beside it is now
 * asserting something false about a real church. The type system carries most of
 * that — `Attribution`'s edited and user variants have no `sourceUrl` field —
 * and these tests carry the rest, because a type cannot tell you that a REVERT
 * put the original words back exactly.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { buildEntry } from "../snapshot.ts";
import {
  applyOp,
  applyOps,
  cardFlags,
  departedEntries,
  exportableItems,
  isSafeGroupId,
  makeExportGroupId,
  resolve,
  sanitizeOp,
  staleEntries,
} from "../group.ts";
import { GROUP_SCHEMA_VERSION, PATH } from "../group-types.ts";
import type { AddedItem, ExportGroup, GroupEntry } from "../group-types.ts";
import { HAVE_FIXTURE, loadIndex, loadRecord } from "./fixture.mts";

const skip = HAVE_FIXTURE ? false : "fixture not present";

/** A church with next-step quotes and contacts, so the edits have something to bite. */
function pick(): { entry: GroupEntry; group: ExportGroup } {
  const index = loadIndex();
  const row =
    index.find((r) => {
      const rec = loadRecord(r.id);
      const cats = rec.next_steps_by_category?.categories ?? [];
      return cats.some((c) => c.state === "present" && c.quote) && (r.em?.length ?? 0) > 0;
    }) ?? index[0];
  const entry = buildEntry(row, loadRecord(row.id), "fixture-1", 1000);
  return { entry, group: group1([entry]) };
}

function group1(entries: GroupEntry[]): ExportGroup {
  return {
    schema: GROUP_SCHEMA_VERSION,
    id: "test-group-a1b2c",
    userId: "u_0123456789abcdef",
    name: "Test group",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    rev: 0,
    entries,
  };
}

const quotedStep = (e: GroupEntry) => e.snapshot.steps.find((s) => s.quote)!;

describe("attribution", { skip }, () => {
  /**
   * THE test. Not `=== undefined` — `in`. A leaked key with an undefined value
   * reads as absent to a loose check and renders as a live link to a component
   * that does `attribution.sourceUrl && <a…>`, which is exactly how an edited
   * quote would end up citing a page it no longer matches.
   */
  test("editing a quote strips its attribution, key and all", () => {
    const { entry, group } = pick();
    const step = quotedStep(entry);
    const before = resolve(entry).steps.find((s) => s.id === step.id)!;
    assert.equal(before.quote?.attribution.kind, "cited");
    assert.ok("sourceUrl" in before.quote!.attribution);

    const g = applyOp(
      group,
      { op: "field.set", orgId: entry.orgId, path: PATH.step(step.id, "quote"), value: "Reworded by hand", base: step.quote },
      2000,
    );
    const after = resolve(g.entries[0]).steps.find((s) => s.id === step.id)!;

    assert.equal(after.quote?.attribution.kind, "edited");
    assert.ok(
      !("sourceUrl" in after.quote!.attribution),
      "an edited quote kept a source URL — it is now citing a page it does not match",
    );
    assert.equal(after.quote?.text, "Reworded by hand");
  });

  test("reverting restores the exact original words and the citation", () => {
    const { entry, group } = pick();
    const step = quotedStep(entry);
    const clean = resolve(entry);

    const edited = applyOp(
      group,
      { op: "field.set", orgId: entry.orgId, path: PATH.step(step.id, "quote"), value: "typo", base: step.quote },
      2000,
    );
    const reverted = applyOp(
      edited,
      { op: "field.revert", orgId: entry.orgId, path: PATH.step(step.id, "quote") },
      3000,
    );

    assert.deepEqual(resolve(reverted.entries[0]), clean, "revert did not return to the pipeline's words");
  });

  /**
   * If revert wrote `""` instead of deleting the key, an emptied slogan and an
   * unedited one would be indistinguishable — and the slogan's third state, "we
   * only read the homepage", would silently become "this church has no slogan"
   * on 83 of 134 churches.
   */
  test("revert deletes the key; editing to empty does not", () => {
    const index = loadIndex();
    const row = index.find((r) => {
      const b = loadRecord(r.id).brand as Record<string, unknown> | undefined;
      return typeof b?.slogan === "string" && b.slogan.trim();
    })!;
    const entry = buildEntry(row, loadRecord(row.id), "fixture-1", 1000);
    const g = group1([entry]);
    const original = entry.snapshot.slogan.text;

    const cleared = applyOp(
      g,
      { op: "field.set", orgId: entry.orgId, path: PATH.slogan, value: "", base: original },
      2000,
    );
    assert.ok(PATH.slogan in cleared.entries[0].edits.fields, "clearing must record an edit");
    assert.equal(resolve(cleared.entries[0]).slogan.kind, "none");

    const reverted = applyOp(cleared, { op: "field.revert", orgId: entry.orgId, path: PATH.slogan }, 3000);
    assert.ok(!(PATH.slogan in reverted.entries[0].edits.fields), "revert must delete the key");
    assert.equal(resolve(reverted.entries[0]).slogan.kind, "slogan");
  });

  test("the three slogan states survive resolution", () => {
    const index = loadIndex();
    const kinds = new Set(
      index.slice(0, 60).map((row) => {
        const e = buildEntry(row, loadRecord(row.id), "p", 1);
        return resolve(e).slogan.kind;
      }),
    );
    assert.ok(kinds.has("slogan"));
    assert.ok(kinds.has("homepage_only"), "the 'inner pages not read' state was lost");
  });

  /** Typing the original back is a revert, not an edit that happens to match. */
  test("typing the original value back clears the edit", () => {
    const { entry, group } = pick();
    const step = quotedStep(entry);
    const path = PATH.step(step.id, "quote");
    const g = applyOps(
      group,
      [
        { op: "field.set", orgId: entry.orgId, path, value: "something else", base: step.quote },
        { op: "field.set", orgId: entry.orgId, path, value: step.quote, base: step.quote },
      ],
      2000,
    );
    assert.ok(!(path in g.entries[0].edits.fields));
    assert.equal(resolve(g.entries[0]).editedCount, 0);
  });

  /** `base` is the ORIGINAL, not the previous value, or revert walks back one step. */
  test("successive edits keep pointing at the pipeline's original", () => {
    const { entry, group } = pick();
    const step = quotedStep(entry);
    const path = PATH.step(step.id, "quote");
    const g = applyOps(
      group,
      [
        { op: "field.set", orgId: entry.orgId, path, value: "first", base: step.quote },
        { op: "field.set", orgId: entry.orgId, path, value: "second", base: "first" },
      ],
      2000,
    );
    assert.equal(g.entries[0].edits.fields[path].base, step.quote);
    const q = resolve(g.entries[0]).steps.find((s) => s.id === step.id)!.quote!;
    assert.equal(
      q.attribution.kind === "edited" ? q.attribution.wasVerbatim : null,
      step.quote,
      "the card would offer to revert to a previous edit rather than to the church's words",
    );
  });
});

describe("provenance", { skip }, () => {
  const added: AddedItem = { id: "u_abc123", at: 5000, kind: "step", label: "Ring the office", quote: "" };

  test("a hand-added item is marked as yours and carries no source URL", () => {
    const { entry, group } = pick();
    const g = applyOp(group, { op: "item.add", orgId: entry.orgId, item: added }, 5000);
    const card = resolve(g.entries[0]);
    const mine = card.steps.find((s) => s.id === "u_abc123")!;

    assert.equal(mine.provenance, "user");
    assert.equal(mine.label.attribution.kind, "user");
    assert.ok(!("sourceUrl" in mine.label.attribution));
    assert.ok(!JSON.stringify(g.entries[0].edits.added).includes("sourceUrl"));
  });

  test("editing a hand-added item leaves it yours, not 'edited'", () => {
    const { entry, group } = pick();
    const g = applyOps(
      group,
      [
        { op: "item.add", orgId: entry.orgId, item: added },
        { op: "field.set", orgId: entry.orgId, path: PATH.step("u_abc123", "label"), value: "Call the office", base: "Ring the office" },
      ],
      5000,
    );
    const mine = resolve(g.entries[0]).steps.find((s) => s.id === "u_abc123")!;
    // "Edited" is a correction to a claim of verbatimness. There was never one.
    assert.equal(mine.label.attribution.kind, "user");
    assert.equal(mine.label.text, "Call the office");
  });

  /** The asymmetry the whole feature turns on. */
  test("pipeline items are suppressed and revertible; yours are deleted", () => {
    const { entry, group } = pick();
    const step = quotedStep(entry);

    const hidden = applyOp(group, { op: "item.suppress", orgId: entry.orgId, itemId: step.id }, 6000);
    const card = resolve(hidden.entries[0]);
    const still = card.steps.find((s) => s.id === step.id);
    assert.ok(still, "a suppressed pipeline step vanished — it must stay visible to be revertible");
    assert.equal(still!.suppressed, true);
    assert.equal(card.suppressedCount, 1);
    assert.ok(hidden.entries[0].snapshot.steps.some((s) => s.id === step.id), "the snapshot was mutated");

    const back = applyOp(hidden, { op: "item.restore", orgId: entry.orgId, itemId: step.id }, 7000);
    assert.equal(resolve(back.entries[0]).steps.find((s) => s.id === step.id)!.suppressed, false);

    const withMine = applyOp(group, { op: "item.add", orgId: entry.orgId, item: added }, 5000);
    const gone = applyOp(withMine, { op: "item.remove", orgId: entry.orgId, itemId: "u_abc123" }, 8000);
    assert.equal(resolve(gone.entries[0]).steps.find((s) => s.id === "u_abc123"), undefined);
    assert.equal(gone.entries[0].edits.added.length, 0);
  });

  test("deleting a hand-added item takes its edits with it", () => {
    const { entry, group } = pick();
    const g = applyOps(
      group,
      [
        { op: "item.add", orgId: entry.orgId, item: added },
        { op: "field.set", orgId: entry.orgId, path: PATH.step("u_abc123", "label"), value: "x", base: "Ring the office" },
        { op: "item.remove", orgId: entry.orgId, itemId: "u_abc123" },
      ],
      5000,
    );
    assert.deepEqual(g.entries[0].edits.fields, {}, "an orphaned edit outlived its item");
    assert.equal(resolve(g.entries[0]).editedCount, 0);
  });

  test("a hand-added item cannot be suppressed", () => {
    const { entry, group } = pick();
    const g = applyOps(
      group,
      [
        { op: "item.add", orgId: entry.orgId, item: added },
        { op: "item.suppress", orgId: entry.orgId, itemId: "u_abc123" },
      ],
      5000,
    );
    // There is no original to fall back to, so a suppressed one would be a row
    // nobody can explain, revert, or remove.
    assert.deepEqual(g.entries[0].edits.suppressed, {});
  });

  test("exportableItems drops suppressed items and keeps yours", () => {
    const { entry, group } = pick();
    const step = quotedStep(entry);
    const g = applyOps(
      group,
      [
        { op: "item.suppress", orgId: entry.orgId, itemId: step.id },
        { op: "item.add", orgId: entry.orgId, item: added },
      ],
      6000,
    );
    const out = exportableItems(resolve(g.entries[0]));
    assert.ok(!out.steps.some((s) => s.id === step.id), "a struck-out step would have been sent");
    assert.ok(out.steps.some((s) => s.id === "u_abc123"));
  });
});

describe("groups are independent", { skip }, () => {
  test("editing a church in one group leaves the same church untouched in another", () => {
    const { entry } = pick();
    const a = group1([buildEntry(loadIndex().find((r) => r.id === entry.orgId)!, loadRecord(entry.orgId), "p", 1)]);
    const b = group1([buildEntry(loadIndex().find((r) => r.id === entry.orgId)!, loadRecord(entry.orgId), "p", 1)]);
    const step = quotedStep(a.entries[0]);

    const editedA = applyOp(
      a,
      { op: "field.set", orgId: entry.orgId, path: PATH.step(step.id, "quote"), value: "changed", base: step.quote },
      2000,
    );

    assert.notDeepEqual(editedA.entries[0], b.entries[0]);
    assert.deepEqual(resolve(b.entries[0]).steps.find((s) => s.id === step.id)!.quote!.attribution.kind, "cited");
  });

  test("removing a church drops it and its edits", () => {
    const { entry, group } = pick();
    const g = applyOp(group, { op: "church.remove", orgId: entry.orgId }, 9000);
    assert.equal(g.entries.length, 0);
  });
});

describe("operations fold predictably", { skip }, () => {
  /** Every flush is a full-blob overwrite, so a retry is only free if this holds. */
  test("replaying the same ops produces the same blob", () => {
    const { entry, group } = pick();
    const step = quotedStep(entry);
    const ops = [
      { op: "field.set", orgId: entry.orgId, path: PATH.step(step.id, "quote"), value: "v", base: step.quote },
      { op: "item.suppress", orgId: entry.orgId, itemId: entry.snapshot.contacts[0]?.id ?? "c_phone" },
      { op: "item.add", orgId: entry.orgId, item: { id: "u_zz9999", at: 1, kind: "contact", name: "N", title: "T", email: "n@x.org" } },
    ] as const;
    const once = applyOps(group, [...ops], 4000);
    const twice = applyOps(once, [...ops], 4000);
    assert.deepEqual(twice, once);
  });

  test("an op for a church that is not in the group changes nothing", () => {
    const { group } = pick();
    const g = applyOp(group, { op: "field.set", orgId: "not_here", path: PATH.name, value: "x", base: "y" }, 1);
    assert.deepEqual(g, group);
  });
});

describe("staleness", { skip }, () => {
  test("keys on the record sha, never on the publish id", () => {
    const { entry, group } = pick();

    const samePublishNewRecord = new Map([[entry.orgId, "different-sha"]]);
    assert.deepEqual([...staleEntries(group, samePublishNewRecord)], [entry.orgId]);

    const sameRecord = new Map([[entry.orgId, entry.rec]]);
    assert.equal(staleEntries(group, sameRecord).size, 0, "an unchanged record was called stale");
  });

  test("a church that left the dataset is departed, not stale", () => {
    const { entry, group } = pick();
    const empty = new Map<string, string>();
    assert.equal(staleEntries(group, empty).size, 0);
    assert.deepEqual([...departedEntries(group, empty)], [entry.orgId]);
  });
});

/**
 * The flags on a review row.
 *
 * They exist to aim a reviewer skimming twenty churches at the places a mistake
 * is most likely, which only works if they are RARE. A flag that appears on
 * every card is not a signal, it is furniture — and the two easiest ways to end
 * up with one are both live here:
 *
 *  · an unedited slogan is `uncited` by construction ("from the site's title"),
 *  · so is an unedited step label ("our category").
 *
 * Flag on `uncited` generally and every one of the 134 churches lights up.
 */
describe("review flags", { skip }, () => {
  const keys = (card: ReturnType<typeof resolve>) => cardFlags(card).map((f) => f.key);

  test("no flag ever claims something is wrong", () => {
    const index = loadIndex();
    for (const row of index.slice(0, 60)) {
      const card = resolve(buildEntry(row, loadRecord(row.id), "fixture-1", 0));
      for (const f of cardFlags(card)) {
        assert.ok(f.title.length > 20, `${f.key} has no explanation`);
        assert.ok(
          !/\b(wrong|bad|error|invalid)\b/i.test(`${f.label} ${f.title}`),
          `"${f.label}" reads as a verdict on the church, not on our pipeline`,
        );
      }
    }
  });

  test("an ordinary church is not flagged for having a slogan and contacts", () => {
    const index = loadIndex();
    const row = index.find((r) => {
      const card = resolve(buildEntry(r, loadRecord(r.id), "f", 0));
      return card.slogan.kind === "slogan" && card.contacts.length > 0 && card.stepsLooked;
    });
    assert.ok(row, "no church in the fixture has a slogan, contacts and read steps");
    const card = resolve(buildEntry(row, loadRecord(row.id), "f", 0));
    assert.ok(!keys(card).includes("slogan"));
    assert.ok(!keys(card).includes("contacts"));
    assert.ok(!keys(card).includes("steps"));
  });

  /**
   * BOTH ABSENCES NOW FLAG THE SAME, AND THAT IS A DECISION, NOT A REGRESSION.
   *
   * This test used to assert the opposite: that `homepage_only` earned its own
   * chip reading "slogan: homepage only", tone `unk`, because "we only read the
   * homepage" is not evidence of absence — /about is where a slogan usually
   * lives, and it was the single most common gap in the corpus.
   *
   * The owner's call is that "inner pages never read" is pipeline vocabulary
   * with no meaning to a salesperson reading a church card, and that both cases
   * are the same job either way: type a slogan in.
   *
   * So the distinction is deliberately no longer SHOWN — but it is still
   * MEASURED, and that is what the first assertion below pins. The day someone
   * wants the wording back, the data is still there and no re-scrape is needed.
   */
  test("both slogan absences flag identically, while the data still tells them apart", () => {
    const index = loadIndex();
    const cardFor = (id: string) => resolve(buildEntry(index.find((r) => r.id === id)!, loadRecord(id), "f", 0));

    const homepageOnly = index.find(
      (r) => resolve(buildEntry(r, loadRecord(r.id), "f", 0)).slogan.kind === "homepage_only",
    );
    const none = index.find(
      (r) => resolve(buildEntry(r, loadRecord(r.id), "f", 0)).slogan.kind === "none",
    );

    // The engine must still be able to tell them apart, or the decision above
    // has quietly become irreversible.
    assert.ok(homepageOnly, "no church resolves to homepage_only — the data distinction was lost");

    const flagOf = (id: string) => cardFlags(cardFor(id)).find((f) => f.key === "slogan")!;
    const a = flagOf(homepageOnly.id);
    assert.equal(a.tone, "plain");
    assert.doesNotMatch(a.label, /homepage/i, "the crawl detail is back in the UI");
    assert.doesNotMatch(a.title, /inner page/i, "the crawl detail is back in the UI");
    assert.ok(a.title.length > 20, "the flag still has to explain itself");

    if (none) {
      const b = flagOf(none.id);
      assert.equal(b.label, a.label, "the two absences must be indistinguishable to a reader");
      assert.equal(b.tone, a.tone);
    }
  });

  test("suppressing the last contact raises the flag; putting it back lowers it", () => {
    const { entry, group } = pick();
    let g = group;
    for (const c of entry.snapshot.contacts) {
      g = applyOp(g, { op: "item.suppress", orgId: entry.orgId, itemId: c.id }, 0);
    }
    assert.ok(
      keys(resolve(g.entries[0])).includes("contacts"),
      "striking out everyone leaves nobody to write to, and the row must say so",
    );

    g = applyOp(g, { op: "item.restore", orgId: entry.orgId, itemId: entry.snapshot.contacts[0].id }, 0);
    assert.ok(!keys(resolve(g.entries[0])).includes("contacts"));
  });

  test("a struck-out quote stops counting as uncitable", () => {
    const index = loadIndex();
    // A church holding a quote we never recorded a page for.
    const found = index
      .map((r) => buildEntry(r, loadRecord(r.id), "f", 0))
      .find((e) =>
        resolve(e).steps.some((s) => s.quote?.attribution.kind === "uncited"),
      );
    if (!found) return; // every quote in this corpus is cited — the stronger case
    const before = cardFlags(resolve(found)).find((f) => f.key === "uncited")!;
    assert.equal(before.tone, "unver");

    let g = group1([found]);
    for (const s of resolve(found).steps) {
      if (s.quote?.attribution.kind === "uncited") {
        g = applyOp(g, { op: "item.suppress", orgId: found.orgId, itemId: s.id }, 0);
      }
    }
    assert.ok(
      !keys(resolve(g.entries[0])).includes("uncited"),
      "an item you have already struck out must not keep asking to be checked",
    );
  });
});

describe("untrusted input", () => {
  /**
   * The group id becomes part of an R2 object key. `groups.ts` refuses a
   * correctly-signed `../../team/config` for exactly this reason, and there is a
   * test asserting it; this is the same rule one layer out.
   */
  test("isSafeGroupId refuses anything that is not our alphabet", () => {
    for (const bad of ["../../team/config", "a/b", "..", "", "Spring Outreach", "a".repeat(200), "-lead", "a.b", "%2e%2e"]) {
      assert.equal(isSafeGroupId(bad), false, `accepted ${JSON.stringify(bad)}`);
    }
    assert.equal(isSafeGroupId("spring-outreach-k3f9a"), true);
  });

  test("makeExportGroupId always produces a safe id", () => {
    for (const name of ["Spring Outreach", "../../etc", "", "  ", "Ünïcödé ✝ Church", "a".repeat(300)]) {
      assert.equal(isSafeGroupId(makeExportGroupId(name, "k3f9a")), true, `unsafe from ${JSON.stringify(name)}`);
    }
  });

  test("sanitizeOp rejects a path outside the grammar", () => {
    const base = { op: "field.set", orgId: "x", value: "v", base: "b" };
    for (const path of ["__proto__", "constructor.prototype", "steps.../x", "snapshot.name", "", "steps.a.b.c"]) {
      assert.equal(sanitizeOp({ ...base, path }), null, `accepted path ${JSON.stringify(path)}`);
    }
    assert.ok(sanitizeOp({ ...base, path: PATH.step("s_connect", "quote") }));
    assert.ok(sanitizeOp({ ...base, path: PATH.name }));
  });

  test("sanitizeOp rejects an added item with a forged id or a source URL", () => {
    const ok = { op: "item.add", orgId: "x", item: { id: "u_abc123", at: 1, kind: "step", label: "L", quote: "Q" } };
    assert.ok(sanitizeOp(ok));

    for (const id of ["s_connect", "../x", "u_", "abc123", ""]) {
      assert.equal(sanitizeOp({ ...ok, item: { ...ok.item, id } }), null, `accepted id ${JSON.stringify(id)}`);
    }
    // A source URL smuggled into an added item must not survive into storage.
    const smuggled = sanitizeOp({ ...ok, item: { ...ok.item, sourceUrl: "https://example.org" } });
    assert.ok(smuggled);
    assert.ok(!JSON.stringify(smuggled).includes("example.org"), "a hand-typed line acquired a citation");
  });

  test("sanitizeOp rejects unknown verbs and oversized values", () => {
    assert.equal(sanitizeOp({ op: "snapshot.replace", orgId: "x" }), null);
    assert.equal(sanitizeOp({ op: "field.set", orgId: "x", path: PATH.name, value: "a".repeat(5000), base: "" }), null);
    assert.equal(sanitizeOp(null), null);
    assert.equal(sanitizeOp("field.set"), null);
  });
});

/* ------------------------------------------------------------------ *
 * The Title
 * ------------------------------------------------------------------ */

/**
 * A STEP HAS ONE TITLE, AND A v2 SNAPSHOT ARRIVES WITH IT ALREADY CHOSEN.
 *
 * `stepsOf` reads `next_steps[].final_name`, where the pipeline has already graded
 * the church's own word against the category and either kept it or swapped ours
 * in, and it writes `ownTerms: []`. So `stepTitle` is a no-op on a v2 step — the
 * first case below pins exactly that, because a rule that quietly started
 * re-deciding would produce a title nobody chose.
 *
 * THE REST OF THIS BLOCK IS THE FREEZE GUARANTEE. A snapshot is frozen when a
 * church is collected, so batches taken before v2 still hold one step per
 * category with both candidates on them, and `stepTitle`'s original rule is still
 * the correct one for that data. These are not dead tests for a dead rule; they
 * are what stops somebody deleting it and silently rewriting the titles in every
 * batch collected before the republish.
 */
describe("the step title", { skip }, () => {
  /** One snapshot step, with only the fields the title rule reads. */
  function withStep(
    entry: GroupEntry,
    step: {
      label: string;
      ownTerms: string[];
      titleConfidence?: string;
      generated?: boolean;
    },
  ): GroupEntry {
    return {
      ...entry,
      snapshot: {
        ...entry.snapshot,
        steps: [
          {
            id: "s_group",
            key: "group",
            label: step.label,
            state: "present",
            ownTerms: step.ownTerms,
            ...(step.titleConfidence === undefined
              ? {}
              : { titleConfidence: step.titleConfidence }),
            ...(step.generated ? { generated: true } : {}),
            quote: "",
            quoteConfidence: "",
            verified: "",
            sourceUrl: "",
          },
        ],
      },
    };
  }

  const titleOf = (entry: GroupEntry) => resolve(entry).steps[0].label;

  /**
   * A v2 step. `ownTerms` is empty because the decision was made upstream, which
   * is precisely what makes `stepTitle` return `label` untouched.
   */
  test("a v2 title is passed through, not re-decided", () => {
    const { entry } = pick();
    const title = titleOf(withStep(entry, { label: "Life Groups", ownTerms: [] }));
    assert.equal(title.text, "Life Groups");
    assert.equal(
      title.attribution.kind === "uncited" ? title.attribution.note : "",
      "our category",
      "the note is about which SOURCE won; on v2 the pipeline already chose",
    );
  });

  /**
   * THE FABRICATED STEP. Every church in the corpus carries one, and it must not
   * be able to look like a step we found on their site.
   */
  test("a fabricated step says we invented it", () => {
    const { entry } = pick();
    const title = titleOf(
      withStep(entry, { label: "Attend a Worship Service", ownTerms: [], generated: true }),
    );
    assert.equal(title.text, "Attend a Worship Service");
    assert.equal(title.attribution.kind, "generated");
  });

  /**
   * A person's correction outranks the mark, and stops claiming we wrote it —
   * "edited" is the honest label once the words are no longer ours either.
   */
  test("editing a fabricated step makes it edited, not still ours", () => {
    const { entry } = pick();
    const base = withStep(entry, {
      label: "Attend a Worship Service",
      ownTerms: [],
      generated: true,
    });
    const edited = applyOp(
      group1([base]),
      {
        op: "field.set",
        orgId: base.orgId,
        path: PATH.step("s_group", "label"),
        value: "Sunday Gathering",
        base: "Attend a Worship Service",
      },
      2000,
    );
    const title = resolve(edited.entries[0]).steps[0].label;
    assert.equal(title.text, "Sunday Gathering");
    assert.equal(title.attribution.kind, "edited");
  });

  test("their wording wins when we have it and nothing argues against it", () => {
    const { entry } = pick();
    const title = titleOf(withStep(entry, { label: "Small groups", ownTerms: ["Life Groups"] }));
    assert.equal(title.text, "Life Groups");
    assert.equal(
      title.attribution.kind === "uncited" ? title.attribution.note : "",
      "their wording",
      "the note records which source won, so the branch is inspectable",
    );
  });

  test("our category is the fallback when the church named nothing", () => {
    const { entry } = pick();
    const title = titleOf(withStep(entry, { label: "Small groups", ownTerms: [] }));
    assert.equal(title.text, "Small groups");
    assert.equal(title.attribution.kind === "uncited" ? title.attribution.note : "", "our category");
  });

  /**
   * THE FIELD IS NOT IN THE CORPUS YET. Absent must mean "no opinion", not
   * "reject" — reading it as a veto would replace every real church word on the
   * page with a category name on the day this shipped.
   */
  test("an absent confidence is not a veto", () => {
    const { entry } = pick();
    assert.equal(
      titleOf(withStep(entry, { label: "Small groups", ownTerms: ["Life Groups"] })).text,
      "Life Groups",
    );
    assert.equal(
      titleOf(withStep(entry, { label: "Small groups", ownTerms: ["Life Groups"], titleConfidence: "" })).text,
      "Life Groups",
      "an empty string is absence, not a low rating",
    );
  });

  test("medium and high are trusted; low and none are not", () => {
    const { entry } = pick();
    for (const c of ["high", "medium", "HIGH", " Medium "]) {
      assert.equal(
        titleOf(withStep(entry, { label: "Small groups", ownTerms: ["Life Groups"], titleConfidence: c })).text,
        "Life Groups",
        `${JSON.stringify(c)} should be trusted`,
      );
    }
    for (const c of ["low", "none"]) {
      assert.equal(
        titleOf(withStep(entry, { label: "Small groups", ownTerms: ["Life Groups"], titleConfidence: c })).text,
        "Small groups",
        `${JSON.stringify(c)} should fall back to our category`,
      );
    }
  });

  /**
   * A value we do not recognise is not a value we can act on. Degrading to our
   * own safe generic label is the only failure this can afford — the alternative
   * is shipping a church a title nobody vouched for.
   */
  test("an unrecognised rating is not trusted", () => {
    const { entry } = pick();
    for (const c of ["probably", "0.8", "yes"]) {
      assert.equal(
        titleOf(withStep(entry, { label: "Small groups", ownTerms: ["Life Groups"], titleConfidence: c })).text,
        "Small groups",
        `${JSON.stringify(c)} should not be trusted`,
      );
    }
  });

  test("an edit beats the rule, whatever the rule would have chosen", () => {
    const { entry } = pick();
    const base = withStep(entry, {
      label: "Small groups",
      ownTerms: ["Life Groups"],
      titleConfidence: "high",
    });
    const edited = applyOp(
      group1([base]),
      { op: "field.set", orgId: base.orgId, path: PATH.step("s_group", "label"), value: "Community Groups", base: "Life Groups" },
      2000,
    );
    const title = resolve(edited.entries[0]).steps[0].label;
    assert.equal(title.text, "Community Groups");
    assert.equal(title.attribution.kind, "edited");
  });

  /**
   * The raw terms stay in the snapshot even though nothing renders them. The
   * snapshot is the frozen record of what the pipeline handed us; the Title is a
   * choice made on top of it, and keeping both is what lets the choice be
   * re-derived or argued with later.
   */
  test("the snapshot keeps the church's own words after the title is chosen", () => {
    const { entry } = pick();
    const e = withStep(entry, { label: "Small groups", ownTerms: ["Life Groups", "LifeGroups"] });
    assert.deepEqual(e.snapshot.steps[0].ownTerms, ["Life Groups", "LifeGroups"]);
    assert.equal(resolve(e).steps[0].label.text, "Life Groups", "the first term is the candidate");
  });
});

describe("pathway steps", { skip }, () => {

  /**
   * The path existed in `PATH` and nothing read it back, so the review sheet
   * offered an editable pathway name whose edits were stored and then ignored on
   * the next render — a field that looked editable and silently was not.
   */
  test("editing the pathway's name survives a re-resolve", () => {
    const { entry, group } = pick();
    const named: ExportGroup = {
      ...group,
      entries: [
        {
          ...entry,
          snapshot: {
            ...entry.snapshot,
            pathway: { ...entry.snapshot.pathway, name: "LIFE Track" },
          },
        },
      ],
    };
    assert.equal(resolve(named.entries[0]).pathway.name, "LIFE Track");

    const edited = applyOp(
      named,
      { op: "field.set", orgId: entry.orgId, path: PATH.finding("label"), value: "Growth Track", base: "LIFE Track" },
      0,
    );
    assert.equal(resolve(edited.entries[0]).pathway.name, "Growth Track");
  });
});
