/**
 * Marks after the queue moved out of them.
 *
 * `goodlead` used to be a third mark meaning "the export queue". The queue is a
 * batch now, and these tests pin the two things that go wrong quietly when a
 * kind is removed from a state shape that has no schema, no whitelist and no
 * version number:
 *
 *  · a retired map surviving in localStorage and being re-persisted forever;
 *  · a fresh profile throwing because something still reads `mine.goodlead`.
 *
 * The second only shows up on a clean browser, which is never the machine of the
 * person who made the change.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  countMarked,
  emptyState,
  exportedAt,
  EXPORT_LOG_ERA,
  hydrate,
  legacyGoodLeadIds,
  persistable,
  reduce,
  rowTint,
  withoutStaleExportLog,
  type LeadState,
} from "../state.ts";

const fresh = () => emptyState("u_0000000000000000");

const mark = (s: LeadState, kind: "star" | "issue", id: string, at = 1000) =>
  reduce(s, { type: "mark.toggle", kind, orgId: id }, at);

describe("row tint precedence", () => {
  const none = { collecting: false, earlier: false, sent: false };

  test("issue > collecting > exported > star", () => {
    let s = fresh();
    s = mark(s, "star", "a");
    assert.equal(rowTint(s, "a", none), "star");

    assert.equal(rowTint(s, "a", { ...none, collecting: true }), "collecting");

    s = mark(s, "issue", "a");
    assert.equal(
      rowTint(s, "a", { ...none, collecting: true }),
      "issue",
      "a data problem outranks everything — it is the one that says do not send this",
    );
  });

  /**
   * Collecting outranks exported deliberately. Collecting an already-sent church
   * again is a real action, and if `exported` won, the click would produce no
   * visible change and read as a dead control.
   */
  test("collecting outranks exported", () => {
    assert.equal(rowTint(fresh(), "a", { ...none, sent: true }), "exported");
    assert.equal(rowTint(fresh(), "a", { ...none, sent: true, collecting: true }), "collecting");
  });

  /**
   * THE TINT COMES FROM THE BATCHES, NOT FROM THE LOG.
   *
   * ◎ used to be read off `lastExportedAt`, which this reducer appends to and
   * never removes from — so a row kept its wash after the batch that produced it
   * had been deleted, and there was no gesture anywhere that could take it off.
   * Deleting a sent batch is explicitly allowed and explicitly means something,
   * so the mark has to be able to go away with it.
   */
  test("the export log alone no longer tints a row", () => {
    const logged = reduce(fresh(), { type: "export.commit", ids: ["a"], at: 500 }, 500);
    assert.equal(exportedAt(logged, "a"), 500, "the timestamp is still recorded");
    assert.equal(
      rowTint(logged, "a", none),
      null,
      "…but with no sent batch behind it, nothing on the row claims it was sent",
    );
  });

  /**
   * A church collected LAST week gets no tint. It is not part of today's work —
   * it says so on its own line and sinks to the bottom instead. Tinting it would
   * put a permanent green wash on a third of the list and make "what did I pick
   * today?" unanswerable, which is the one question the wash exists to answer.
   */
  test("an earlier batch does not tint the row", () => {
    assert.equal(rowTint(fresh(), "a", { ...none, earlier: true }), null);
  });

  test("an unmarked, uncollected church has no tint", () => {
    assert.equal(rowTint(fresh(), "a", none), null);
  });
});

describe("two marks, not three", () => {
  test("a fresh state has star and issue and nothing else", () => {
    assert.deepEqual(Object.keys(fresh().mine).sort(), ["issue", "star"]);
    assert.deepEqual(Object.keys(fresh().team).sort(), ["issue", "star"]);
  });

  test("counting a mark does not depend on the export log any more", () => {
    let s = fresh();
    s = mark(s, "star", "a");
    s = mark(s, "star", "b");
    assert.equal(countMarked(s, "star"), 2);
    // Exporting used to remove churches from the good-lead count. Stars are not
    // a queue and must not move when something is sent.
    s = reduce(s, { type: "export.commit", ids: ["a"], at: 2000 }, 2000);
    assert.equal(countMarked(s, "star"), 2);
  });

  test("toggling a mark off removes it, so a re-mark is a fresh timestamp", () => {
    let s = mark(fresh(), "issue", "a", 1000);
    s = mark(s, "issue", "a", 2000);
    assert.equal(countMarked(s, "issue"), 0);
  });
});

describe("the retired ✆ mark", () => {
  const stale = {
    userId: "u_1",
    mine: {
      star: { keep_me: 5 },
      issue: {},
      goodlead: { old_b: 20, old_a: 10, old_c: 30 },
    },
    lastExportedAt: {},
    notes: {},
    config: {},
  };

  /** Newest first, so the offer to move them reads in the order they were made. */
  test("legacy ids are recovered, newest first", () => {
    assert.deepEqual(legacyGoodLeadIds(stale), ["old_c", "old_b", "old_a"]);
  });

  test("it never throws on a profile that never had one", () => {
    assert.deepEqual(legacyGoodLeadIds({ mine: { star: {}, issue: {} } }), []);
    assert.deepEqual(legacyGoodLeadIds({}), []);
    assert.deepEqual(legacyGoodLeadIds(null), []);
    assert.deepEqual(legacyGoodLeadIds("nonsense"), []);
    assert.deepEqual(legacyGoodLeadIds({ mine: { goodlead: "not an object" } }), []);
  });

  test("loading keeps only the kinds that still exist", () => {
    const loaded = hydrate(stale, "u_0000000000000000");
    assert.deepEqual(Object.keys(loaded.mine).sort(), ["issue", "star"]);
    assert.equal(loaded.mine.star.keep_me, 5, "a real mark was dropped");
    assert.ok(!JSON.stringify(loaded).includes("goodlead"));
  });

  /** The re-persist path is the actual bug — dropping it on read is not enough. */
  test("a retired map is not written back out", () => {
    assert.ok(!JSON.stringify(persistable(hydrate(stale, "u_1"))).includes("goodlead"));
  });
});

/**
 * The ◎ marks left behind by the stub export.
 *
 * `↓ Export good leads` dispatched `export.commit` and produced no file, so
 * every church it touched still claims to have been sent. ◎ is the only defence
 * against writing to a church twice, and a defence built on a false record is
 * worse than none — it will quietly hold back a lead nobody ever contacted.
 *
 * "STALE BY CONSTRUCTION" WAS TRUE AND IS NOT ANY MORE. It held only while
 * nothing could write the log; `ExportDialog` now dispatches `export.commit`
 * after the demos exist. So this whole block is about a blob carrying NO ERA
 * MARKER — the stub's shape — and the era-marked case is asserted below it.
 * Every fixture here deliberately omits `exportLogEra`.
 */
describe("the stub export's ◎ marks", () => {
  const sent = {
    userId: "u_1",
    mine: { star: { keep_me: 5 }, issue: { flagged: 7 } },
    lastExportedAt: { trbc_org: 1712000000000, hills_org: 1712000000001 },
    notes: { trbc_org: "called them, no answer" },
    config: { colors: {}, favor: null },
  };

  test("they do not survive a load", () => {
    const loaded = hydrate(sent, "u_0000000000000000");
    assert.deepEqual(loaded.lastExportedAt, {});
    assert.equal(exportedAt(loaded, "trbc_org"), 0);
  });

  /**
   * The read alone would not have fixed it. `persistable()` writes the whole
   * object on the next keystroke, which is precisely how entries written weeks
   * ago outlived every subsequent change.
   */
  test("they are not written back out", () => {
    const out = persistable(hydrate(sent, "u_1"));
    assert.deepEqual(out.lastExportedAt, {});
    assert.ok(!JSON.stringify(out).includes("1712000000000"));
  });

  test("no row can tint itself exported off a stale profile", () => {
    const loaded = hydrate(sent, "u_1");
    assert.equal(
      rowTint(loaded, "trbc_org", { collecting: false, earlier: false, sent: false }),
      null,
    );
  });

  /** Surgical, not `reset()`. Stars, issues, notes and the favor model are real. */
  test("everything else in the profile survives", () => {
    const loaded = hydrate(sent, "u_1");
    assert.equal(loaded.mine.star.keep_me, 5);
    assert.equal(loaded.mine.issue.flagged, 7);
    assert.equal(loaded.notes.trbc_org, "called them, no answer");
  });

  /**
   * The log's SHAPE stays — `export.commit` is what a real export will dispatch,
   * and ◎ has to keep working the moment one does. What was purged is the
   * false data, not the mechanism.
   */
  test("a real export would still mark a church", () => {
    const loaded = hydrate(sent, "u_1");
    const after = reduce(loaded, { type: "export.commit", ids: ["trbc_org"], at: 99 }, 99);
    assert.equal(exportedAt(after, "trbc_org"), 99);
  });

  /**
   * Dropping them on read is not the same as clearing them. Without this, the
   * bytes sit on the disk until the user happens to change something else, and
   * "cleared" would mean "invisible".
   */
  test("they are taken off the disk, not just out of memory", () => {
    const cleaned = withoutStaleExportLog(sent)!;
    assert.ok(cleaned, "a profile carrying them must be rewritten");
    assert.ok(!("lastExportedAt" in cleaned));
    assert.deepEqual(cleaned.notes, sent.notes, "the rest of the blob is untouched");
    assert.deepEqual(cleaned.mine, sent.mine);
    // It copies. Mutating the caller's object would leave `hydrate` — which runs
    // on the same parsed blob right after — reading a shape nobody wrote.
    assert.ok("lastExportedAt" in sent, "the input was mutated");
  });

  test("a profile with nothing to clear is not rewritten at all", () => {
    assert.equal(withoutStaleExportLog({ mine: {}, lastExportedAt: {} }), null);
    assert.equal(withoutStaleExportLog({ mine: {} }), null);
    assert.equal(withoutStaleExportLog(null), null);
    assert.equal(withoutStaleExportLog("nonsense"), null);
  });

  /**
   * THE ONE THAT WOULD HAVE BITTEN. `persistable(hydrate(raw))` would clear the
   * export log in one line — and take the retired ✆ marks with it, answering the
   * console's "move these into a batch?" offer with "discard" before anyone saw
   * the question. The offer reads raw storage.
   */
  test("clearing the export log leaves the retired ✆ marks for the migration bar", () => {
    const withLegacy = {
      ...sent,
      mine: { star: {}, issue: {}, goodlead: { old_a: 10, old_b: 20 } },
    };
    const cleaned = withoutStaleExportLog(withLegacy)!;
    assert.deepEqual(legacyGoodLeadIds(cleaned), ["old_b", "old_a"]);
    assert.ok(!("lastExportedAt" in cleaned));
  });

  test("a profile that never had the key is untouched", () => {
    assert.deepEqual(hydrate({ mine: { star: {}, issue: {} } }, "u_1").lastExportedAt, {});
    assert.deepEqual(hydrate(null, "u_1"), emptyState("u_1"));
    assert.deepEqual(hydrate("nonsense", "u_1"), emptyState("u_1"));
  });
});

/**
 * A REAL EXPORT LOG HAS TO SURVIVE A PAGE LOAD.
 *
 * It did not, and the way it failed is worth pinning: `hydrate` hard-coded
 * `lastExportedAt: {}` and `withoutStaleExportLog` deleted the key from storage,
 * both correct while the only writer was a stub button that produced no file.
 * The export finishes with `window.location.href = /studio/g/<id>`, a full
 * navigation, so the console is ALWAYS re-entered as a fresh document — every
 * Sent mark was erased before anything could read it once. Three shipped claims
 * were structurally false: the rail's Sent counter, the "Sent only" filter, and
 * the badge `LeadRow` calls the only defence against contacting a church twice.
 *
 * The distinguishing fact is `exportLogEra`, because the two kinds of entry are
 * identical by inspection — same shape, same plausible timestamps.
 */
describe("the export log, once something real writes it", () => {
  const real = {
    userId: "u_1",
    mine: { star: {}, issue: {} },
    lastExportedAt: { trbc_org: 1712000000000 },
    exportLogEra: EXPORT_LOG_ERA,
    notes: {},
    config: { colors: {}, favor: null },
  };

  test("an era-marked log survives the load", () => {
    const loaded = hydrate(real, "u_1");
    assert.deepEqual(loaded.lastExportedAt, { trbc_org: 1712000000000 });
    assert.equal(exportedAt(loaded, "trbc_org"), 1712000000000);
  });

  test("and is written back out, so it survives the NEXT load too", () => {
    const out = persistable(hydrate(real, "u_1"));
    assert.deepEqual(out.lastExportedAt, { trbc_org: 1712000000000 });
    assert.equal(out.exportLogEra, EXPORT_LOG_ERA);
  });

  /** The migration must not fire against a log it did not write. */
  test("the disk cleanup leaves an era-marked log alone", () => {
    assert.equal(withoutStaleExportLog(real), null);
  });

  /**
   * The whole point of the era marker: two blobs identical but for it, one
   * carried and one discarded.
   */
  test("the same bytes without the marker are still discarded", () => {
    const unmarked = { ...real };
    delete (unmarked as Partial<typeof real>).exportLogEra;
    assert.deepEqual(hydrate(unmarked, "u_1").lastExportedAt, {});
    assert.ok(withoutStaleExportLog(unmarked), "and taken off the disk");
  });

  /** It stamps the current era even on a blob that had none, so the one-time
   *  purge is one-time: the next load reads a marked blob. */
  test("hydrate stamps the era, so the purge does not repeat forever", () => {
    const out = persistable(hydrate({ mine: { star: {}, issue: {} } }, "u_1"));
    assert.equal(out.exportLogEra, EXPORT_LOG_ERA);
    assert.equal(withoutStaleExportLog(out), null);
  });

  /** A round trip through a real export: commit, persist, reload, still sent. */
  test("commit → persist → reload keeps the mark", () => {
    const after = reduce(fresh(), { type: "export.commit", ids: ["a_org", "b_org"] , at: 99 }, 0);
    const reloaded = hydrate(persistable(after), "u_1");
    assert.equal(exportedAt(reloaded, "a_org"), 99);
    assert.equal(exportedAt(reloaded, "b_org"), 99);
    assert.equal(reloaded.lastExportedAt.a_org, 99);
  });
});
