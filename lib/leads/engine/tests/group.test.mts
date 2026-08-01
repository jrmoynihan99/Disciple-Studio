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
  departedEntries,
  exportableItems,
  fresherGroup,
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
 * The storage lag guard.
 *
 * Vercel Blob returns the PREVIOUS contents of a key for roughly ten seconds
 * after an overwrite — measured, and not preventable from the client side. An
 * autosaving editor folds each flush into whatever it reads, so without this
 * rule two saves a second apart both read the same old group and the second one
 * silently throws away the first. The bug leaves no trace on screen: the edit
 * appears, is acknowledged, and is gone on reload.
 */
describe("preferring the copy we wrote while the store is behind", { skip }, () => {
  const g = (rev: number): ExportGroup => ({ ...group1([]), rev });

  test("a stale read loses to what we just wrote", () => {
    const out = fresherGroup(g(1), { group: g(2), at: 1_000 }, 1_500, 120_000);
    assert.equal(out.group?.rev, 2, "the older stored copy won — an edit is now lost");
    assert.equal(out.expired, false);
  });

  test("a genuinely newer stored copy wins — this is not a write-back cache", () => {
    // Another writer got there. Ours is only ever a patch over OUR OWN lag.
    assert.equal(fresherGroup(g(5), { group: g(2), at: 1_000 }, 1_500, 120_000).group?.rev, 5);
    assert.equal(fresherGroup(g(2), { group: g(2), at: 1_000 }, 1_500, 120_000).group?.rev, 2);
  });

  test("the remembered copy expires, and says so, so it can be dropped", () => {
    const out = fresherGroup(g(1), { group: g(2), at: 0 }, 200_000, 120_000);
    assert.equal(out.group?.rev, 1);
    assert.equal(out.expired, true);
  });

  test("with nothing remembered, the store is the truth", () => {
    assert.equal(fresherGroup(g(3), undefined, 1_000, 120_000).group?.rev, 3);
    assert.equal(fresherGroup(null, undefined, 1_000, 120_000).group, null);
  });

  test("a write the store has not admitted to yet is still served", () => {
    assert.equal(fresherGroup(null, { group: g(1), at: 1_000 }, 1_100, 120_000).group?.rev, 1);
  });
});

describe("untrusted input", () => {
  /**
   * The group id becomes part of a Vercel Blob key. `identity.ts` refuses a
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
