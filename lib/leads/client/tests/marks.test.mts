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
  legacyGoodLeadIds,
  persistable,
  reduce,
  rowTint,
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
   * THE TINT COMES FROM THE BATCHES, AND FROM NOTHING IN THIS FILE.
   *
   * ◎ used to be read off an append-only log here which nothing ever removed
   * from, so a row kept its wash after the batch that produced it had been
   * deleted and no gesture anywhere could take it off. Deleting a sent batch is
   * explicitly allowed and explicitly means something, so the mark has to be able
   * to go with it. The state layer now has no opinion at all: whatever a profile
   * holds, only the caller's `sent` decides.
   */
  test("no profile can tint a row exported on its own", () => {
    let s = fresh();
    s = mark(s, "star", "a");
    s = mark(s, "issue", "b");
    assert.equal(rowTint(s, "a", none), "star");
    assert.equal(rowTint(s, "b", none), "issue");
    assert.equal(rowTint(s, "c", none), null);
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

  /**
   * Stars are not a queue. Exporting used to remove churches from the good-lead
   * count, and nothing about sending a church may move a mark somebody set —
   * which is now true by construction, since no mutation this reducer accepts has
   * anything to do with exporting.
   */
  test("no mutation here has anything to do with sending", () => {
    let s = fresh();
    s = mark(s, "star", "a");
    s = mark(s, "star", "b");
    assert.equal(countMarked(s, "star"), 2);
    assert.equal(countMarked(s, "issue"), 0);
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
 * THE EXPORT LOG IS RETIRED, AND MUST NOT COME BACK.
 *
 * `lastExportedAt` was a per-device append-only map of who had been sent a demo,
 * with an `exportLogEra` marker to tell real entries from ones a stub button had
 * written. It is gone: it could record that a church was written to and could not
 * record that the batch which wrote to it was later deleted, so the Sent counter,
 * the "Extracted only" filter and the ◎ badge all reported from a source their owner
 * could not correct. `wasSent(membership, orgId)` answers it now, from the
 * batches that still exist — see `collect.test.mts`.
 *
 * WHAT IS PINNED HERE IS THE RETIREMENT ITSELF. Profiles carrying both keys are
 * on real disks, and the failure mode of a half-removal is that they ride back in
 * on `hydrate`'s spread and get written out again forever. That is the same bug
 * the retired ✆ mark had, in the same file, which is why it is worth a test
 * rather than a comment.
 */
describe("the retired export log", () => {
  const old = {
    userId: "u_1",
    mine: { star: { keep_me: 5 }, issue: { flagged: 7 } },
    lastExportedAt: { trbc_org: 1712000000000, hills_org: 1712000000001 },
    exportLogEra: 1,
    notes: { trbc_org: "called them, no answer" },
    config: { colors: {}, favor: null },
  };

  /**
   * A retired key still rides in on `hydrate`'s spread, exactly like any other
   * key nobody named — that is this loader's documented shape and not worth a
   * special case. What matters is that nothing reads it (the type has no such
   * field, so `tsc` is the check) and that it never reaches the disk again, which
   * is the next test.
   */
  test("a profile carrying it still loads", () => {
    const loaded = hydrate(old, "u_0000000000000000");
    assert.equal(loaded.userId, "u_0000000000000000");
    assert.deepEqual(Object.keys(loaded.mine).sort(), ["issue", "star"]);
  });

  /**
   * The read alone never fixed anything here — `persistable()` writes the whole
   * object on the next keystroke, which is exactly how entries written weeks ago
   * outlived every subsequent change. Not naming the key IS the removal.
   */
  test("it is not written back out, so it dies on the next save", () => {
    const out = JSON.stringify(persistable(hydrate(old, "u_1")));
    assert.ok(!out.includes("lastExportedAt"));
    assert.ok(!out.includes("exportLogEra"));
    assert.ok(!out.includes("1712000000000"));
  });

  /** Surgical, not a wipe. Stars, issues, notes and the favor model are real. */
  test("everything else in the profile survives", () => {
    const loaded = hydrate(old, "u_1");
    assert.equal(loaded.mine.star.keep_me, 5);
    assert.equal(loaded.mine.issue.flagged, 7);
    assert.equal(loaded.notes.trbc_org, "called them, no answer");
  });

  /**
   * THE ONE THAT WOULD HAVE BITTEN. Removing the log by rewriting storage —
   * `persistable(hydrate(raw))` — is one line, and it would take the retired ✆
   * marks with it, answering the console's "move these into a batch?" offer with
   * "discard" before anybody saw the question. That offer reads RAW storage, so
   * nothing may rewrite it on load. Retiring the field through `persistable`
   * alone is what keeps both true.
   */
  test("retiring it does not disturb the retired ✆ marks on disk", () => {
    const withLegacy = {
      ...old,
      mine: { star: {}, issue: {}, goodlead: { old_a: 10, old_b: 20 } },
    };
    assert.deepEqual(legacyGoodLeadIds(withLegacy), ["old_b", "old_a"]);
    // …and the console's own read of the raw blob is unchanged by loading it.
    hydrate(withLegacy, "u_1");
    assert.deepEqual(legacyGoodLeadIds(withLegacy), ["old_b", "old_a"]);
  });

  test("a profile that never had the key is untouched", () => {
    assert.deepEqual(hydrate(null, "u_1"), emptyState("u_1"));
    assert.deepEqual(hydrate("nonsense", "u_1"), emptyState("u_1"));
    assert.deepEqual(hydrate({ mine: { star: {}, issue: {} } }, "u_1"), emptyState("u_1"));
  });
});
