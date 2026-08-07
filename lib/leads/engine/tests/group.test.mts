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
import { exportContacts, recipientOf } from "../contacts.ts";
import { GROUP_SCHEMA_VERSION, LOGO_ITEM_ID, PATH } from "../group-types.ts";
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
   * An edit recorded as `""` and an absent edit look identical to a naive
   * reader, so revert has to DELETE the key rather than write the original back
   * — otherwise a value cleared on purpose and a value nobody touched become the
   * same thing, and the card can no longer say which.
   *
   * MEASURED ON A QUOTE, WHICH IS WHERE IT IS NOW TESTABLE. It used to be
   * measured on the slogan, and cannot be any more: the pipeline's slogan is no
   * longer offered (see `resolveSlogan`), so a slogan's base is `""` and clearing
   * one IS a revert by `setField`'s own rule rather than an edit to empty. The
   * rule under test never changed; the field that can still demonstrate it did.
   */
  test("revert deletes the key; editing to empty does not", () => {
    const { entry, group } = pick();
    const step = quotedStep(entry);
    const path = PATH.step(step.id, "quote");
    const quoteOf = (g: ExportGroup) =>
      resolve(g.entries[0]).steps.find((s) => s.id === step.id)!.quote;

    const cleared = applyOp(
      group,
      { op: "field.set", orgId: entry.orgId, path, value: "", base: step.quote },
      2000,
    );
    assert.ok(path in cleared.entries[0].edits.fields, "clearing must record an edit");
    assert.equal(quoteOf(cleared)?.text, "");
    assert.equal(quoteOf(cleared)?.attribution.kind, "edited");

    const reverted = applyOp(cleared, { op: "field.revert", orgId: entry.orgId, path }, 3000);
    assert.ok(!(path in reverted.entries[0].edits.fields), "revert must delete the key");
    assert.equal(quoteOf(reverted)?.text, step.quote);
  });

  /**
   * THE SLOGAN IS THE REVIEWER'S TO WRITE, AND THE PIPELINE'S IS NOT OFFERED.
   *
   * `brand.slogan` comes off a `<title>` tag — "Home | First Baptist Church |
   * Springfield, IL" — and it HEADLINES the demo a church receives. Owner's call
   * to stop presenting it: every card opens blank and somebody types one.
   *
   * BOTH HALVES ARE ASSERTED, because the decision is only defensible while the
   * second one holds. The card must not resolve a slogan nobody wrote, AND the
   * snapshot must still carry what was found, scope and all — this is a change
   * to what we present, not a measurement thrown away, and the day somebody
   * wants a "use the one we found" control the string has to still be there.
   */
  test("the pipeline's slogan never reaches the card, and the snapshot keeps it", () => {
    const index = loadIndex();
    let withText = 0;
    let homepageOnly = 0;
    for (const row of index.slice(0, 60)) {
      const e = buildEntry(row, loadRecord(row.id), "p", 1);
      if (e.snapshot.slogan.text) withText++;
      else if (e.snapshot.slogan.scope) homepageOnly++;
      assert.equal(
        resolve(e).slogan.kind,
        "none",
        `${row.id} opened with a slogan nobody wrote`,
      );
    }
    assert.ok(withText > 0, "no church in the fixture has a slogan — this proves nothing");
    assert.ok(homepageOnly > 0, "the 'inner pages not read' state was lost from the snapshot");
  });

  /** What a reviewer types is theirs — never "edited", which would claim there
   *  was a church's sentence underneath it to go back to. */
  test("a slogan somebody writes is attributed to them, and clears back to blank", () => {
    const { entry, group } = pick();
    const written = applyOp(
      group,
      { op: "field.set", orgId: entry.orgId, path: PATH.slogan, value: "Come and see", base: "" },
      2000,
    );
    const card = resolve(written.entries[0]);
    assert.equal(card.slogan.kind, "slogan");
    assert.equal(card.slogan.kind === "slogan" && card.slogan.voice.text, "Come and see");
    assert.equal(
      card.slogan.kind === "slogan" && card.slogan.voice.attribution.kind,
      "user",
      "a slogan a reviewer wrote must not be presented as an edit of the church's words",
    );

    const wiped = applyOp(
      written,
      { op: "field.set", orgId: entry.orgId, path: PATH.slogan, value: "", base: "" },
      3000,
    );
    assert.equal(resolve(wiped.entries[0]).slogan.kind, "none");
    assert.ok(!(PATH.slogan in wiped.entries[0].edits.fields), "typing it back to blank is a revert");
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

  /**
   * A HAND-ADDED PATHWAY STEP KEEPS THE QUOTE SOMEBODY TYPED INTO IT.
   *
   * `resolvePathwaySteps` hard-coded `quote: null` for added steps and never read
   * `PATH.pathwayStep(id, "quote")` — while the card drew the same editable quote
   * cell it draws on a pipeline step, `sanitizeOp` accepted the op, and the
   * server wrote it to R2. So the text was saved, permanently, and disappeared
   * from the screen on the next render. Three branches resolve an edit like this
   * and only this one was missing it.
   */
  test("a quote typed onto a hand-added pathway step survives the render", () => {
    const { entry, group } = pick();
    const item: AddedItem = {
      id: "u_path01",
      at: 5000,
      kind: "pathwayStep",
      label: "Meet with a mentor",
      blurb: "",
    };
    const g = applyOps(
      group,
      [
        { op: "item.add", orgId: entry.orgId, item },
        {
          op: "field.set",
          orgId: entry.orgId,
          path: PATH.pathwayStep("u_path01", "quote"),
          value: "They pair you with someone for a season.",
          base: "",
        },
      ],
      5000,
    );
    const mine = resolve(g.entries[0]).pathway.steps.find((s) => s.id === "u_path01")!;
    assert.equal(mine.quote?.text, "They pair you with someone for a season.");
    // `user`, never `edited`: a person typed it and there was no earlier version
    // belonging to anybody else. Above all, no `sourceUrl` may appear.
    assert.equal(mine.quote?.attribution.kind, "user");
    assert.ok(!("sourceUrl" in (mine.quote?.attribution ?? {})));
  });

  /** An added step with no quote still resolves to none, not to an empty quote. */
  test("a hand-added pathway step with no quote has none", () => {
    const { entry, group } = pick();
    const item: AddedItem = {
      id: "u_path02",
      at: 5000,
      kind: "pathwayStep",
      label: "Meet with a mentor",
      blurb: "",
    };
    const g = applyOp(group, { op: "item.add", orgId: entry.orgId, item }, 5000);
    const mine = resolve(g.entries[0]).pathway.steps.find((s) => s.id === "u_path02")!;
    assert.equal(mine.quote, null);
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

  /**
   * THE SLOGAN FLAG IS A TO-DO NOW, and this is what keeps it one.
   *
   * Every card starts without a slogan — the pipeline's is no longer offered —
   * so this flag is on every church until somebody writes one. That is the one
   * permitted exception to "a flag that appears on every card is furniture", and
   * it is only permitted because it GOES OUT when the work is done. If it ever
   * stopped clearing, it would be furniture on all 15,273 cards.
   */
  test("writing a slogan clears its flag, and an ordinary church has no others", () => {
    const index = loadIndex();
    const row = index.find((r) => {
      const card = resolve(buildEntry(r, loadRecord(r.id), "f", 0));
      return card.contacts.length > 0 && card.stepsLooked;
    });
    assert.ok(row, "no church in the fixture has contacts and read steps");

    const entry = buildEntry(row, loadRecord(row.id), "f", 0);
    assert.ok(
      keys(resolve(entry)).includes("slogan"),
      "a church with no slogan written must say so — it is the reviewer's job",
    );

    const written = applyOp(
      group1([entry]),
      { op: "field.set", orgId: entry.orgId, path: PATH.slogan, value: "Come and see", base: "" },
      1,
    );
    const card = resolve(written.entries[0]);
    assert.ok(!keys(card).includes("slogan"), "the flag survived the work being done");
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

    /**
     * ASKED OF THE SNAPSHOT, NOT OF THE CARD, and that is the whole point of the
     * first assertion. Every card resolves to `none` now — no slogan is offered
     * — so a search over resolved cards could no longer tell the two absences
     * apart, which is exactly the loss this test exists to notice. On the
     * snapshot the distinction is still there and still measured.
     */
    const scopeOf = (r: (typeof index)[number]) =>
      buildEntry(r, loadRecord(r.id), "f", 0).snapshot.slogan;
    const homepageOnly = index.find((r) => {
      const s = scopeOf(r);
      return !s.text && !!s.scope;
    });
    const none = index.find((r) => {
      const s = scopeOf(r);
      return !s.text && !s.scope;
    });

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

  /**
   * THE CROP'S URL BECOMES THE `<img src>` OF A PUBLIC PAGE.
   *
   * Which makes it the most dangerous string any of these ops carries: stored
   * once, it is served to a congregation from a page wearing our name. It is
   * held to the exact shape `putLogo` produces rather than to "looks like a
   * URL", so an absolute URL to any host — including one we would trust today —
   * cannot be stored, and neither can a `javascript:` or `data:` payload.
   */
  test("sanitizeOp refuses a crop that points anywhere but our own asset store", () => {
    const sha = "a".repeat(64);
    const ok = {
      op: "logo.crop",
      orgId: "x",
      crop: { sha, url: `/api/asset/logos/${"b".repeat(64)}.webp`, x: 0.1, y: 0.1, w: 0.5, h: 0.5 },
    };
    assert.ok(sanitizeOp(ok));
    assert.deepEqual(sanitizeOp({ op: "logo.crop", orgId: "x", crop: null }), {
      op: "logo.crop",
      orgId: "x",
      crop: null,
    });

    for (const url of [
      "https://evil.example.org/logo.png",
      "javascript:alert(1)",
      "data:image/svg+xml,<svg onload=alert(1)>",
      "//evil.example.org/x.png",
      "/api/asset/logos/../../secret.png",
      "/api/asset/churches/first-baptist.json",
      "/api/asset/logos/short.png",
      "",
    ]) {
      assert.equal(
        sanitizeOp({ ...ok, crop: { ...ok.crop, url } }),
        null,
        `accepted crop url ${JSON.stringify(url)}`,
      );
    }

    // A rectangle can only ever describe part of its own image.
    for (const rect of [
      { x: -0.1, y: 0, w: 0.5, h: 0.5 },
      { x: 0.8, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0, w: 0, h: 0.5 },
      { x: 0, y: 0, w: 2, h: 0.5 },
      { x: 0, y: 0, w: 0.5, h: Number.NaN },
    ]) {
      assert.equal(sanitizeOp({ ...ok, crop: { ...ok.crop, ...rect } }), null, "accepted a rectangle off the image");
    }
  });

  /**
   * The accent ends up in a `style` attribute on a page a church opens, so the
   * alphabet is the check: six hex digits cannot spell `url(` or close a quote.
   * Shorthand is normalised rather than refused, because `#fff` is what a person
   * types and what a colour input hands back.
   */
  test("sanitizeOp accepts a hex colour and nothing else", () => {
    assert.deepEqual(sanitizeOp({ op: "accent.set", orgId: "x", accent: "#1F3A5F" }), {
      op: "accent.set",
      orgId: "x",
      accent: "#1f3a5f",
    });
    assert.deepEqual(sanitizeOp({ op: "accent.set", orgId: "x", accent: "0af" }), {
      op: "accent.set",
      orgId: "x",
      accent: "#00aaff",
    });
    assert.deepEqual(sanitizeOp({ op: "accent.set", orgId: "x", accent: null }), {
      op: "accent.set",
      orgId: "x",
      accent: null,
    });
    for (const accent of ["red", "rgb(1,2,3)", "#12345", "url(x)", "#fff\"", "expression(1)", ""]) {
      assert.equal(sanitizeOp({ op: "accent.set", orgId: "x", accent }), null, `accepted ${JSON.stringify(accent)}`);
    }
  });

  test("sanitizeOp refuses a reorder that is not a list of item ids", () => {
    assert.ok(sanitizeOp({ op: "items.reorder", orgId: "x", list: "steps", ids: ["s_connect", "u_ab12"] }));
    assert.equal(sanitizeOp({ op: "items.reorder", orgId: "x", list: "contacts", ids: [] }), null);
    assert.equal(sanitizeOp({ op: "items.reorder", orgId: "x", list: "steps", ids: "s_connect" }), null);
    assert.equal(sanitizeOp({ op: "items.reorder", orgId: "x", list: "steps", ids: ["../x"] }), null);
    assert.equal(sanitizeOp({ op: "items.reorder", orgId: "x", list: "steps", ids: [1, 2] }), null);
    assert.equal(
      sanitizeOp({ op: "items.reorder", orgId: "x", list: "steps", ids: Array(201).fill("s_a") }),
      null,
      "an unbounded list is a payload, not an order",
    );
  });

  test("sanitizeOp holds a chosen contact to the item-id alphabet", () => {
    assert.ok(sanitizeOp({ op: "contact.sendTo", orgId: "x", contactId: "c_lead_pastor" }));
    assert.deepEqual(sanitizeOp({ op: "contact.sendTo", orgId: "x", contactId: null }), {
      op: "contact.sendTo",
      orgId: "x",
      contactId: null,
    });
    for (const id of ["../x", "a b", "", "c".repeat(100)]) {
      assert.equal(sanitizeOp({ op: "contact.sendTo", orgId: "x", contactId: id }), null, `accepted ${JSON.stringify(id)}`);
    }
  });
});

/* ------------------------------------------------------------------ *
 * The order a reviewer put the steps in
 * ------------------------------------------------------------------ */

/**
 * THE ORDER ON THE CARD IS THE ORDER THE CHURCH RECEIVES.
 *
 * `toRawChurch` maps the resolved lists straight into `next_steps` and the
 * pathway's `order`, and `generateDemo` walks both in that order — the first
 * step is the one the demo makes focal. So a stored order is not decoration, and
 * the two things that can go wrong with one are both here: it must survive a
 * re-resolve exactly, and it must degrade rather than delete when it goes stale.
 */
describe("reordering steps", { skip }, () => {
  const stepsOf = (g: ExportGroup) => resolve(g.entries[0]).steps.map((s) => s.id);

  /** A church with at least three next steps, so an order can be wrong. */
  function threeSteps(): { entry: GroupEntry; group: ExportGroup } {
    const index = loadIndex();
    const row = index.find((r) => {
      const e = buildEntry(r, loadRecord(r.id), "f", 0);
      return e.snapshot.steps.length >= 3;
    });
    assert.ok(row, "no church in the fixture has three next steps");
    const entry = buildEntry(row, loadRecord(row.id), "f", 0);
    return { entry, group: group1([entry]) };
  }

  test("the order somebody drags into is the order that resolves", () => {
    const { entry, group } = threeSteps();
    const ids = stepsOf(group);
    const moved = [ids[2], ids[0], ids[1], ...ids.slice(3)];

    const g = applyOp(group, { op: "items.reorder", orgId: entry.orgId, list: "steps", ids: moved }, 1);
    assert.deepEqual(stepsOf(g), moved);
    // Replaying the same op is not a second reorder.
    assert.deepEqual(
      stepsOf(applyOp(g, { op: "items.reorder", orgId: entry.orgId, list: "steps", ids: moved }, 2)),
      moved,
    );
  });

  test("a step added after a reorder lands at the end, not at the front", () => {
    const { entry, group } = threeSteps();
    const ids = stepsOf(group);
    const g = applyOps(
      group,
      [
        { op: "items.reorder", orgId: entry.orgId, list: "steps", ids: [ids[1], ids[0], ...ids.slice(2)] },
        {
          op: "item.add",
          orgId: entry.orgId,
          item: { id: "u_added01", at: 1, kind: "step", label: "Hand added", quote: "" },
        },
      ],
      1,
    );
    assert.equal(stepsOf(g).at(-1), "u_added01", "an id the order does not name must sort last");
    assert.deepEqual(stepsOf(g).slice(0, 2), [ids[1], ids[0]], "the stored order was lost");
  });

  test("an order naming ids this church does not have is not stored", () => {
    const { entry, group } = threeSteps();
    const g = applyOp(
      group,
      { op: "items.reorder", orgId: entry.orgId, list: "steps", ids: ["s_ghost", "s_phantom"] },
      1,
    );
    assert.equal(g.entries[0].edits.order, undefined, "a ghost order would push every real step below it");
    assert.deepEqual(stepsOf(g), stepsOf(group));
  });

  test("dragging a pathway into an order renumbers it, and never claims a sequence", () => {
    const index = loadIndex();
    const row = index.find((r) => {
      const e = buildEntry(r, loadRecord(r.id), "f", 0);
      return e.snapshot.pathway.steps.length >= 3;
    });
    assert.ok(row, "no church in the fixture has a three-step pathway");
    const entry = buildEntry(row, loadRecord(row.id), "f", 0);
    const group = group1([entry]);

    const before = resolve(entry).pathway;
    const ids = before.steps.map((s) => s.id);
    const moved = [ids[2], ids[0], ids[1], ...ids.slice(3)];
    const g = applyOp(group, { op: "items.reorder", orgId: entry.orgId, list: "pathway", ids: moved }, 1);
    const after = resolve(g.entries[0]).pathway;

    assert.deepEqual(after.steps.map((s) => s.id), moved);
    assert.equal(
      after.numbered,
      before.numbered,
      "whether the church published a sequence is not a thing a drag may decide",
    );
    if (after.numbered) {
      assert.deepEqual(
        after.steps.map((s) => s.ordinal),
        after.steps.map((_, i) => i + 1),
        "a hand-ordered pathway kept the numbers the church gave a different order",
      );
    }
  });
});

/* ------------------------------------------------------------------ *
 * Who the email is addressed to
 * ------------------------------------------------------------------ */

/**
 * ONE ADDRESS, CHOSEN BY A PERSON, HONOURED EVERYWHERE.
 *
 * `exportContacts` ranks the contacts and rank 1 is what gets written to, which
 * was true before this and inferable by nobody. These pin the two halves of the
 * fix: the choice moves the ranking (so the card, the demo's greeting and the
 * campaign cannot disagree), and a choice that has gone stale is ignored rather
 * than obeyed into a bounce.
 */
describe("choosing the recipient", { skip }, () => {
  /** A church with two or more contacts carrying real addresses. */
  function twoAddressed(): { entry: GroupEntry; group: ExportGroup } {
    const index = loadIndex();
    const row = index.find((r) => {
      const card = resolve(buildEntry(r, loadRecord(r.id), "f", 0));
      return card.contacts.filter((c) => c.email.includes("@")).length >= 2;
    });
    assert.ok(row, "no church in the fixture lists two addresses");
    const entry = buildEntry(row, loadRecord(row.id), "f", 0);
    return { entry, group: group1([entry]) };
  }

  test("the chosen contact takes rank 1, and the demo greets whoever gets the email", () => {
    const { entry, group } = twoAddressed();
    const addressed = resolve(entry).contacts.filter((c) => c.email.includes("@"));
    const second = addressed[1];

    const g = applyOp(group, { op: "contact.sendTo", orgId: entry.orgId, contactId: second.id }, 1);
    const card = resolve(g.entries[0]);
    assert.equal(card.sendTo, second.id);

    const ranked = exportContacts(card.contacts, card.sendTo);
    assert.equal(ranked[0].contact.id, second.id, "the choice did not move the ranking");
    assert.equal(ranked[0].rank, 1);
    assert.equal(recipientOf(ranked)?.contact.id, second.id);
  });

  test("choosing a contact that cannot be written to changes nothing", () => {
    const { entry, group } = twoAddressed();
    const card = resolve(entry);
    const before = exportContacts(card.contacts).map((r) => r.contact.id);

    // An id this church does not have is not stored at all.
    const ghost = applyOp(group, { op: "contact.sendTo", orgId: entry.orgId, contactId: "c_ghost" }, 1);
    assert.equal(ghost.entries[0].edits.sendTo, undefined);

    // A contact with no address IS stored — it is a real row somebody clicked —
    // and the ranking simply stands, because there is nothing to address to it.
    const nameless = card.contacts.find((c) => !c.email.trim());
    if (nameless) {
      const g = applyOp(group, { op: "contact.sendTo", orgId: entry.orgId, contactId: nameless.id }, 1);
      const after = resolve(g.entries[0]);
      assert.deepEqual(
        exportContacts(after.contacts, after.sendTo).map((r) => r.contact.id),
        before,
      );
    }
  });

  test("striking out the chosen contact hands the email to the next one", () => {
    const { entry, group } = twoAddressed();
    const addressed = resolve(entry).contacts.filter((c) => c.email.includes("@"));
    const second = addressed[1];

    const g = applyOps(
      group,
      [
        { op: "contact.sendTo", orgId: entry.orgId, contactId: second.id },
        { op: "item.suppress", orgId: entry.orgId, itemId: second.id },
      ],
      1,
    );
    const card = resolve(g.entries[0]);
    const ranked = exportContacts(card.contacts, card.sendTo);
    assert.notEqual(
      recipientOf(ranked)?.contact.id,
      second.id,
      "a struck-out contact was still going to be written to",
    );
    assert.ok(
      ranked.some((r) => r.contact.id === second.id && r.rank === null),
      "the struck contact must stay on the card so it can be put back",
    );
  });
});

/* ------------------------------------------------------------------ *
 * The colour the demo is painted in
 * ------------------------------------------------------------------ */

describe("overriding the accent", { skip }, () => {
  test("a chosen colour resolves onto the card and clears back to the measured one", () => {
    const { entry, group } = pick();
    assert.equal(resolve(entry).accent, "", "a card claimed an override nobody made");

    const set = applyOp(group, { op: "accent.set", orgId: entry.orgId, accent: "#1f3a5f" }, 1);
    assert.equal(resolve(set.entries[0]).accent, "#1f3a5f");
    assert.ok(resolve(set.entries[0]).editedCount > 0, "choosing a colour is work somebody did");

    const cleared = applyOp(set, { op: "accent.set", orgId: entry.orgId, accent: null }, 2);
    assert.equal(resolve(cleared.entries[0]).accent, "");
    assert.equal(
      cleared.entries[0].edits.accent,
      undefined,
      "the key must go, so 'did a human overrule us' stays answerable by its presence",
    );
  });
});

/* ------------------------------------------------------------------ *
 * The logo, trimmed
 * ------------------------------------------------------------------ */

describe("cropping the logo", { skip }, () => {
  const crop = (sha: string) => ({
    sha,
    url: `/api/asset/logos/${"c".repeat(64)}.webp`,
    x: 0.1,
    y: 0.2,
    w: 0.6,
    h: 0.5,
  });

  /** A church whose snapshot carries a logo — there is nothing to crop otherwise. */
  function withLogo(): { entry: GroupEntry; group: ExportGroup } {
    const index = loadIndex();
    const row = index.find((r) => !!buildEntry(r, loadRecord(r.id), "f", 0).snapshot.logo);
    assert.ok(row, "no church in the fixture has a logo");
    const entry = buildEntry(row, loadRecord(row.id), "f", 0);
    return { entry, group: group1([entry]) };
  }

  test("a crop resolves onto the card and survives a re-resolve", () => {
    const { entry, group } = withLogo();
    const sha = entry.snapshot.logo!.sha;
    const g = applyOp(group, { op: "logo.crop", orgId: entry.orgId, crop: crop(sha) }, 1);
    assert.deepEqual(resolve(g.entries[0]).logoCrop, crop(sha));

    const off = applyOp(g, { op: "logo.crop", orgId: entry.orgId, crop: null }, 2);
    assert.equal(resolve(off.entries[0]).logoCrop, null);
    assert.equal(off.entries[0].edits.logoCrop, undefined, "the key must go, not be blanked");
  });

  /**
   * THE TRADE THIS PROTECTS. A crop is a rectangle cut out of ONE image; drawn
   * over a different mark it is a slice of a picture nobody chose — and most
   * picks are wordmarks while most alternatives are icons, so the slice is
   * usually empty space.
   */
  test("switching to another logo drops the crop, and resolve refuses a stale one", () => {
    const { entry, group } = withLogo();
    const sha = entry.snapshot.logo!.sha;
    const other = { sha: "d".repeat(64), ext: "png", theme: "light" };

    const g = applyOps(
      group,
      [
        { op: "logo.crop", orgId: entry.orgId, crop: crop(sha) },
        { op: "logo.pick", orgId: entry.orgId, logo: other },
      ],
      1,
    );
    assert.equal(g.entries[0].edits.logoCrop, undefined, "the crop followed the reviewer to a new mark");
    assert.equal(resolve(g.entries[0]).logoCrop, null);

    // And the second lock: a crop left on disk for a mark this card no longer
    // ships never resolves, whatever wrote it there.
    const stale: GroupEntry = {
      ...entry,
      edits: { ...entry.edits, logoPick: other, logoCrop: crop(sha) },
    };
    assert.equal(resolve(stale).logoCrop, null);
  });

  test("removing the logo removes the crop with it", () => {
    const { entry, group } = withLogo();
    const sha = entry.snapshot.logo!.sha;
    const g = applyOps(
      group,
      [
        { op: "logo.crop", orgId: entry.orgId, crop: crop(sha) },
        { op: "item.suppress", orgId: entry.orgId, itemId: LOGO_ITEM_ID },
      ],
      1,
    );
    const card = resolve(g.entries[0]);
    assert.equal(card.logo, null);
    assert.equal(card.logoCrop, null, "a demo with no logo cannot have a cropped one");
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
   * THIS TEST USED TO ASSERT THE OPPOSITE, and its reasoning was wrong.
   *
   * It said: "a person's correction outranks the mark, and stops claiming we
   * wrote it — `edited` is the honest label once the words are no longer ours
   * either." The first half is right and the conclusion does not follow, because
   * `edited` does not mean "somebody changed this". It means "this WAS the
   * church's words and is not any more" — it renders as "edited — no longer the
   * church's words" over a revert button titled `Original: <wasVerbatim>`.
   *
   * On a fabricated step that original is a string the PIPELINE made up, on all
   * 15,273 records. So one keystroke turned an honest "added by us" into two
   * separate assertions that the church had published something it never did,
   * which is precisely what the `Attribution` union exists to make unspellable.
   *
   * `editedGenerated` keeps the fabrication visible and still offers our wording
   * back. Compare the added-item rule below: what a thing IS survives editing.
   */
  test("editing a fabricated step keeps it ours, and never claims it was theirs", () => {
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
    assert.equal(title.attribution.kind, "editedGenerated");
    assert.equal(
      title.attribution.kind === "editedGenerated" ? title.attribution.wasGenerated : "",
      "Attend a Worship Service",
      "our wording is offered back — as OURS, not as the church's",
    );
    // THE ASSERTION THAT MATTERS: nothing anywhere on this voice can be read as
    // a claim about what the church published.
    assert.notEqual(title.attribution.kind, "edited");
    assert.ok(
      !("wasVerbatim" in title.attribution),
      "`wasVerbatim` would be a lie here — nothing was ever verbatim anything",
    );
  });

  /** A real found step is unaffected: editing one is still `edited`, because
   *  there genuinely was a church sentence and it genuinely is gone. */
  test("editing a step the church DID publish is still `edited`", () => {
    const { entry } = pick();
    const base = withStep(entry, { label: "Life Groups", ownTerms: [] });
    const edited = applyOp(
      group1([base]),
      {
        op: "field.set",
        orgId: base.orgId,
        path: PATH.step("s_group", "label"),
        value: "Small Groups",
        base: "Life Groups",
      },
      2000,
    );
    const title = resolve(edited.entries[0]).steps[0].label;
    assert.equal(title.attribution.kind, "edited");
    assert.equal(
      title.attribution.kind === "edited" ? title.attribution.wasVerbatim : "",
      "Life Groups",
    );
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
