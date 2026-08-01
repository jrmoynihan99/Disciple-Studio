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
  hydrate,
  isDownloaded,
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
  const none = { collecting: false, earlier: false };

  test("issue > collecting > exported > star", () => {
    let s = fresh();
    s = mark(s, "star", "a");
    assert.equal(rowTint(s, "a", none), "star");

    assert.equal(rowTint(s, "a", { collecting: true, earlier: false }), "collecting");

    s = mark(s, "issue", "a");
    assert.equal(
      rowTint(s, "a", { collecting: true, earlier: false }),
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
    const s = reduce(fresh(), { type: "export.commit", ids: ["a"], at: 500 }, 500);
    assert.equal(isDownloaded(s, "a"), true);
    assert.equal(rowTint(s, "a", none), "exported");
    assert.equal(rowTint(s, "a", { collecting: true, earlier: false }), "collecting");
  });

  /**
   * A church collected LAST week gets no tint. It is not part of today's work —
   * it says so on its own line and sinks to the bottom instead. Tinting it would
   * put a permanent green wash on a third of the list and make "what did I pick
   * today?" unanswerable, which is the one question the wash exists to answer.
   */
  test("an earlier batch does not tint the row", () => {
    assert.equal(rowTint(fresh(), "a", { collecting: false, earlier: true }), null);
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
 * Nothing in the codebase can write it today (`export.commit` has no
 * dispatcher), so any entry found in a saved profile is stale by construction.
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
    assert.equal(isDownloaded(loaded, "trbc_org"), false);
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
    assert.equal(rowTint(loaded, "trbc_org", { collecting: false, earlier: false }), null);
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
    assert.equal(isDownloaded(after, "trbc_org"), true);
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
