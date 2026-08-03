/**
 * Collecting — the daily loop.
 *
 * The job is: find the twenty best NEW churches, collect them, review, send,
 * repeat tomorrow. Two things in that sentence are load-bearing and neither is
 * visible when it breaks:
 *
 *  · "NEW" — a church collected last Tuesday must sink, or you spend the week
 *    rediscovering the same congregations;
 *  · "the twenty you are collecting NOW" must NOT sink, or the list reshuffles
 *    under your cursor every time you press ✆.
 *
 * Both are one boolean apart, which is exactly why they are asserted.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { demoteCollected } from "../filter.ts";
import { membershipFrom, nextBatchName, statusOf } from "../group.ts";
import {
  EMPTY_MEMBERSHIP,
  collectingCount,
  earlierBatches,
  editsInOpenBatch,
  isCollecting,
  refoldMembership,
  sentCount,
  wasSent,
  type ExportGroup,
  type GroupEntry,
  type GroupStatus,
  type Membership,
  type MembershipRef,
  type PendingCollect,
} from "../group-types.ts";
import type { ChurchView } from "../adapt.ts";

const view = (id: string, name = id): ChurchView =>
  ({ id, name }) as ChurchView;

const entry = (orgId: string): GroupEntry =>
  ({ orgId, addedAt: 0, rec: "", publishId: "", snapshot: {}, edits: {} }) as unknown as GroupEntry;

function group(id: string, name: string, status: GroupStatus, orgIds: string[]): ExportGroup {
  return {
    schema: 1,
    id,
    userId: "u_0000000000000000",
    name,
    status,
    createdAt: "",
    updatedAt: "",
    rev: 0,
    entries: orgIds.map(entry),
  };
}

describe("membership", () => {
  const today = group("aug-2", "Aug 2", "open", ["a", "b"]);
  const lastWeek = group("aug-1", "Aug 1", "exported", ["b", "c"]);
  const m = membershipFrom([today, lastWeek]);

  test("the open batch is the collect target", () => {
    assert.equal(m.openGroupId, "aug-2");
    assert.equal(isCollecting(m, "a"), true);
    assert.equal(isCollecting(m, "c"), false);
    assert.equal(isCollecting(EMPTY_MEMBERSHIP, "a"), false);
  });

  /**
   * The distinction the whole feature turns on. `b` is in BOTH — collected today
   * and sent last week — so it is being collected now AND has history. Merging
   * the two would either sink today's work or hide last week's.
   */
  test("a church can be in today's batch and an earlier one at once", () => {
    assert.equal(isCollecting(m, "b"), true);
    assert.deepEqual(
      earlierBatches(m, "b").map((g) => g.name),
      ["Aug 1"],
    );
    assert.deepEqual(earlierBatches(m, "a"), [], "today's batch is not 'earlier'");
    assert.deepEqual(
      earlierBatches(m, "c").map((g) => g.status),
      ["exported"],
    );
  });

  /**
   * This payload is fetched on every console load — nobody clicks for it. One
   * group is ~210 KB, so a snapshot leaking in here would put every quote and
   * contact of every collected church on the critical path of opening the page,
   * and nothing would look wrong. It would just get slower every day.
   */
  test("it carries ids and names only — never a snapshot", () => {
    const fat = group("aug-3", "Aug 3", "open", []);
    fat.entries = [
      {
        orgId: "trbc_org",
        addedAt: 1,
        rec: "sha",
        publishId: "p",
        snapshot: {
          name: "Thomas Road Baptist Church",
          contacts: [{ id: "c_rec_0", email: "someone@trbc.org" }],
          steps: [{ id: "s_connect", quote: "Get Ready for Your Visit!" }],
        },
        edits: { fields: {}, suppressed: {}, added: [] },
      } as unknown as GroupEntry,
    ];

    const json = JSON.stringify(membershipFrom([fat]));
    for (const leak of ["Thomas Road", "trbc.org", "Get Ready", "snapshot", "quote", "email"]) {
      assert.ok(!json.includes(leak), `the membership payload leaked ${JSON.stringify(leak)}`);
    }
    assert.deepEqual(JSON.parse(json).byOrg.trbc_org, [
      { id: "aug-3", name: "Aug 3", status: "open" },
    ]);
  });

  test("a batch written before batches existed reads as open", () => {
    const legacy = group("old", "Old", "open", ["z"]);
    delete (legacy as { status?: unknown }).status;
    const out = membershipFrom([legacy]);
    assert.equal(out.openGroupId, "old");
    assert.equal(out.byOrg.z[0].status, "open");
  });

  test("with no open batch there is no collect target", () => {
    const out = membershipFrom([lastWeek]);
    assert.equal(out.openGroupId, null);
    assert.equal(isCollecting(out, "c"), false);
  });
});

/**
 * WHAT AN ✆ CLICK WOULD DESTROY.
 *
 * Un-collecting fires `church.remove`, which drops the whole entry — the frozen
 * snapshot and every correction typed into it — with no undo, and re-collecting
 * re-snapshots from the live record. The review page has always stopped to say
 * so; the console could not, because membership carried ids and nothing else.
 *
 * A COUNT PER CHURCH, NOT THE EDITS THEMSELVES. This payload is fetched on every
 * console load and its standing rule is that it stays proportional to what has
 * been collected rather than to the corpus.
 */
describe("edits at risk in the open batch", () => {
  const edited = (orgId: string, edits: unknown): GroupEntry =>
    ({ orgId, addedAt: 0, rec: "", publishId: "", snapshot: {}, edits }) as unknown as GroupEntry;

  const withEntries = (id: string, status: GroupStatus, entries: GroupEntry[]): ExportGroup =>
    ({ ...group(id, id, status, []), entries }) as ExportGroup;

  test("all three kinds of change are counted", () => {
    const g = withEntries("aug-2", "open", [
      edited("a", { fields: { name: {}, slogan: {} }, suppressed: { s_group: 1 }, added: [{}] }),
    ]);
    assert.equal(membershipFrom([g], "aug-2").edited.a, 4);
  });

  /** ABSENT, not zero — an untouched church must toggle off without a dialog. */
  test("an untouched church is not in the map at all", () => {
    const g = withEntries("aug-2", "open", [edited("a", { fields: {}, suppressed: {}, added: [] })]);
    const m = membershipFrom([g], "aug-2");
    assert.deepEqual(m.edited, {});
    assert.equal(editsInOpenBatch(m, "a"), 0);
  });

  /**
   * ONLY THE OPEN BATCH. A sent batch cannot be un-collected from, so counting it
   * would put a size on the payload for no question anybody can ask.
   */
  test("edits in a sent batch are not counted", () => {
    const open = withEntries("aug-2", "open", [edited("a", { fields: {}, suppressed: {}, added: [] })]);
    const sent = withEntries("aug-1", "exported", [
      edited("b", { fields: { name: {} }, suppressed: {}, added: [] }),
    ]);
    const m = membershipFrom([open, sent], "aug-2");
    assert.deepEqual(m.edited, {});
    assert.equal(editsInOpenBatch(m, "b"), 0);
  });

  /** It reads whatever is on disk, and a batch written before a key existed is
   *  still a valid batch. A counter is not the place to throw. */
  test("a partial or missing `edits` does not throw", () => {
    const g = withEntries("aug-2", "open", [
      edited("a", { fields: { name: {} } }),
      edited("b", undefined),
    ]);
    const m = membershipFrom([g], "aug-2");
    assert.equal(m.edited.a, 1);
    assert.equal(editsInOpenBatch(m, "b"), 0);
  });

  /** Tolerates a payload deserialised from before the field existed. */
  test("the helper survives a membership with no map", () => {
    assert.equal(editsInOpenBatch({ openGroupId: null, byOrg: {} } as Membership, "a"), 0);
    assert.equal(editsInOpenBatch(EMPTY_MEMBERSHIP, "a"), 0);
  });
});

describe("already-collected churches sink", () => {
  const rows = ["a", "b", "c", "d", "e"].map((id) => view(id));
  const byName = (x: ChurchView, y: ChurchView) => x.name.localeCompare(y.name);

  test("earlier-batch churches go last, and keep their order among themselves", () => {
    const isEarlier = (id: string) => id === "a" || id === "c";
    const out = rows.slice().sort(demoteCollected(byName, isEarlier));
    assert.deepEqual(out.map((v) => v.id), ["b", "d", "e", "a", "c"]);
  });

  /**
   * THE ONE THAT MATTERS WHILE YOU WORK. Pressing ✆ must not move the row you
   * just pressed it on — a list that reorders under the cursor makes collecting
   * twenty churches in a row impossible.
   */
  test("collecting a church does not move it, but an earlier batch does", () => {
    const m = membershipFrom([
      group("aug-2", "Aug 2", "open", ["c"]), // collected just now
      group("aug-1", "Aug 1", "exported", ["a"]), // collected last week
    ]);
    const isEarlier = (id: string) => earlierBatches(m, id).length > 0;
    const out = rows.slice().sort(demoteCollected(byName, isEarlier));

    assert.deepEqual(
      out.map((v) => v.id),
      ["b", "c", "d", "e", "a"],
      "`c` was just collected and must hold its place; `a` is old work and must sink",
    );
    assert.equal(isCollecting(m, "c"), true);
    assert.equal(isEarlier("c"), false, "today's batch must never count as earlier");
  });

  test("with nothing collected the sort is untouched", () => {
    assert.deepEqual(
      rows.slice().sort(demoteCollected(byName, () => false)).map((v) => v.id),
      rows.slice().sort(byName).map((v) => v.id),
    );
  });

  test("the demotion wraps any sort rather than replacing it", () => {
    // Reverse-alphabetical inner sort: the demotion must not resurrect A-Z.
    const reverse = (x: ChurchView, y: ChurchView) => y.name.localeCompare(x.name);
    const out = rows.slice().sort(demoteCollected(reverse, (id) => id === "e"));
    assert.deepEqual(out.map((v) => v.id), ["d", "c", "b", "a", "e"]);
  });
});

describe("which batch is being collected into", () => {
  /**
   * THE POINTER IS THE ANSWER; THIS ONLY VALIDATES IT.
   *
   * These tests replace a suite about `group.close`, which is gone. That op
   * existed so exactly one batch could be `open`, because the collect target was
   * derived by scanning for it. With the target stored explicitly, "finished"
   * stopped being a state a batch could be in — a batch is collectable, or it has
   * been sent.
   */
  const aug1 = group("aug-1", "Aug 1", "open", ["a"]);
  const aug2 = group("aug-2", "Aug 2", "open", ["b"]);

  test("the stored pointer wins, not document order", () => {
    assert.equal(membershipFrom([aug1, aug2], "aug-1").openGroupId, "aug-1");
    assert.equal(membershipFrom([aug1, aug2], "aug-2").openGroupId, "aug-2");
  });

  /**
   * The pointer names a batch that has been deleted since it was written — or was
   * never written at all, which is true of every batch collected before it
   * existed. Falling back is what makes this change need no migration.
   */
  test("a pointer naming nothing falls back to the newest collectable batch", () => {
    const newest = { ...aug2, updatedAt: "2026-08-02T10:00:00.000Z" };
    const older = { ...aug1, updatedAt: "2026-08-01T10:00:00.000Z" };
    assert.equal(membershipFrom([older, newest], "deleted-batch").openGroupId, "aug-2");
    assert.equal(membershipFrom([older, newest], null).openGroupId, "aug-2");
  });

  /**
   * The owner's rule, and it costs no code: an exported batch can never be the
   * answer, so exporting the one you were on leaves nothing selected and the next
   * collect starts a fresh batch.
   */
  test("an exported batch is never the target, even when pointed at", () => {
    const sent = group("aug-1", "Aug 1", "exported", ["a"]);
    assert.equal(membershipFrom([sent], "aug-1").openGroupId, null);
    assert.equal(isCollecting(membershipFrom([sent], "aug-1"), "a"), false);
    assert.deepEqual(
      earlierBatches(membershipFrom([sent], "aug-1"), "a").map((g) => g.status),
      ["exported"],
      "a sent batch is history the moment it goes out",
    );
  });

  test("every batch exported means nothing is being collected", () => {
    const all = membershipFrom([group("aug-1", "Aug 1", "exported", ["a"])], null);
    assert.equal(all.openGroupId, null);
  });

  /** The retired third state still reads off disk, as `open`. */
  test("a batch stored as `closed` is collectable again", () => {
    const legacy = { ...aug1, status: "closed" as never };
    assert.equal(statusOf(legacy), "open");
    assert.equal(membershipFrom([legacy], "aug-1").openGroupId, "aug-1");
  });
});

describe("filters", () => {
  test("`collected` counts today's batch as well as earlier ones", () => {
    const m: Membership = membershipFrom([
      group("aug-2", "Aug 2", "open", ["a"]),
      group("aug-1", "Aug 1", "exported", ["b"]),
    ]);
    const collected = (id: string) => (m.byOrg[id]?.length ?? 0) > 0;
    assert.equal(collected("a"), true, "filtering to collected must show today's work");
    assert.equal(collected("b"), true);
    assert.equal(collected("z"), false);
  });
});

/**
 * THE RAIL'S COUNTER AGAINST A CORPUS THAT MOVED.
 *
 * Batch membership is stored per user and outlives a republish, so a church
 * collected against an earlier corpus keeps its entry after its `org_id` leaves
 * the dataset. Counted naively the rail read "2 churches in this batch" while
 * not one row rendered as collecting — a row can only exist for a church the
 * publish still carries — and the deck's "already collected", which counts rows,
 * read 0. Two honest numbers about two different sets is the worst kind of
 * disagreement: neither looks wrong on its own, so nobody investigates.
 */
describe("the collecting counter, across a republish", () => {
  const today = group("aug-2", "Aug 2", "open", ["a", "gone", "b"]);
  const m = membershipFrom([today]);
  /** The new publish dropped `gone`. */
  const corpus = new Set(["a", "b", "c"]);
  const present = (id: string) => corpus.has(id);

  test("a church the publish no longer carries is not counted", () => {
    assert.equal(collectingCount(m, present), 2);
    assert.equal(collectingCount(m, () => true), 3, "the entry itself is still there");
  });

  test("the counter agrees with the rows that can actually render", () => {
    const renderable = [...corpus].filter((id) => isCollecting(m, id));
    assert.equal(collectingCount(m, present), renderable.length);
  });

  test("nothing is deleted — the departed entry survives for the review page", () => {
    assert.equal(today.entries.length, 3);
    assert.ok(today.entries.some((e) => e.orgId === "gone"));
    assert.ok(isCollecting(m, "gone"), "membership still knows about it");
  });

  test("an entry in an EARLIER batch is never counted, present or not", () => {
    const two = membershipFrom([
      group("aug-2", "Aug 2", "open", ["a"]),
      group("aug-1", "Aug 1", "exported", ["b", "gone"]),
    ]);
    assert.equal(collectingCount(two, present), 1);
  });

  test("no open batch means nothing is being collected", () => {
    const sent = membershipFrom([group("aug-1", "Aug 1", "exported", ["a", "b"])], null);
    assert.equal(sent.openGroupId, null);
    assert.equal(collectingCount(sent, present), 0);
    assert.equal(collectingCount(EMPTY_MEMBERSHIP, present), 0);
  });

  test("every entry departing reads zero, not the stored count", () => {
    const allGone = membershipFrom([group("aug-2", "Aug 2", "open", ["x", "y"])]);
    assert.equal(collectingCount(allGone, present), 0);
  });
});

/**
 * Automatic batch names, after batches stopped being one-a-day.
 *
 * `openGroup` used to guarantee uniqueness for free: it found the open batch or
 * made one, so a second `Aug 2` could not exist. Finishing a batch and collecting
 * again now makes another the same afternoon, and two rows reading `Aug 2` in a
 * picker whose whole job is telling them apart is the failure that introduces.
 */
describe("automatic batch names", () => {
  const aug2 = new Date("2026-08-02T15:00:00Z");

  test("the first batch of the day is just the date", () => {
    assert.equal(nextBatchName([], aug2), "Aug 2");
  });

  test("a second batch the same day gets a counter, and it keeps counting", () => {
    assert.equal(nextBatchName(["Aug 2"], aug2), "Aug 2 · 2");
    assert.equal(nextBatchName(["Aug 2", "Aug 2 · 2"], aug2), "Aug 2 · 3");
  });

  /** Yesterday's batches must not push today's name to `· 2`. */
  test("only the same day's names are counted against", () => {
    assert.equal(nextBatchName(["Aug 1", "Aug 1 · 2", "Jul 30"], aug2), "Aug 2");
  });

  /**
   * The number is DERIVED, never stored — so renaming `Aug 2` to something else
   * frees it up again. A stored counter would have to be migrated and would drift
   * the first time a batch was deleted.
   */
  test("a renamed batch gives its name back", () => {
    assert.equal(nextBatchName(["Charlotte", "Aug 2 · 2"], aug2), "Aug 2");
  });

  test("a hand-typed name is never silently reused", () => {
    const names = ["Aug 2", "Aug 2 · 2", "Aug 2 · 3"];
    const next = nextBatchName(names, aug2);
    assert.ok(!names.includes(next), `${next} collides with an existing batch`);
  });
});

/**
 * WAS THIS CHURCH SENT A DEMO — and, more to the point, can the answer ever
 * become "no" again?
 *
 * It used to be read off `lastExportedAt`, an append-only log in the browser's
 * own storage which the export wrote to and nothing ever removed from. That made
 * the console's three Sent surfaces — the counter, the "Extracted only" filter and the
 * ◎ badge — unfalsifiable: delete every sent batch and it still reported forty
 * churches contacted, from a source its owner had no way to correct.
 *
 * Batches ARE the record, and deleting one is a decision the product explicitly
 * allows. So the answer is derived from the batches that still exist, and these
 * pin the consequence in both directions: it goes true when a batch is sent, and
 * false again when that batch is gone.
 */
describe("sent, derived from the batches that exist", () => {
  const open = group("aug-2", "Aug 2", "open", ["a", "b"]);
  const sent = group("aug-1", "Aug 1", "exported", ["b", "c"]);

  test("a church in a sent batch was sent; one in an open batch was not", () => {
    const m = membershipFrom([open, sent]);
    assert.equal(wasSent(m, "a"), false, "collected today, not sent");
    assert.equal(wasSent(m, "c"), true);
    assert.equal(wasSent(m, "never_collected_org"), false);
  });

  /** `b` is in both. Being collected again does not un-send it. */
  test("collecting a church again does not undo having sent it", () => {
    assert.equal(wasSent(membershipFrom([open, sent]), "b"), true);
  });

  /**
   * THE ONE THE OWNER ASKED FOR. Deleting the sent batches is what the console
   * sees as `membershipFrom` over what is left, and the count has to follow it
   * down — including to zero.
   */
  test("deleting the sent batches takes the count with them", () => {
    assert.equal(sentCount(membershipFrom([open, sent])), 2, "b and c");
    const afterDelete = membershipFrom([open]);
    assert.equal(sentCount(afterDelete), 0);
    assert.equal(wasSent(afterDelete, "b"), false);
    assert.equal(wasSent(afterDelete, "c"), false);
    assert.equal(sentCount(EMPTY_MEMBERSHIP), 0);
  });

  /**
   * A church is counted once however many sent batches it is in — this is a
   * count of churches contacted, not of times contacted, and the label says
   * "Sent" beside "Starred" and "Issue", which are both counts of churches.
   */
  test("a church in two sent batches counts once", () => {
    const also = group("jul-9", "Jul 9", "exported", ["c"]);
    assert.equal(sentCount(membershipFrom([sent, also])), 2, "b and c, not three");
  });

  /**
   * NOT FILTERED TO THE CURRENT PUBLISH, unlike `collectingCount`. That one has
   * to agree with the rows on screen; this one says who has been contacted, and a
   * church that has since left the dataset was still contacted. Under-reporting
   * it would break the only thing standing between a reviewer and emailing the
   * same church twice.
   */
  test("a church that has left the dataset is still counted", () => {
    const m = membershipFrom([group("aug-1", "Aug 1", "exported", ["departed_org"])]);
    assert.equal(sentCount(m), 1);
  });
});

/**
 * THE ✆ THAT FLICKERED ON, OFF, AND ON AGAIN.
 *
 * Collecting is optimistic — the row turns green on the click and the write
 * follows — and the console re-reads the membership map afterwards. That re-read
 * REPLACED the whole snapshot, so a read already in flight when the click landed
 * came back without the church, un-marked the row, and the click's own re-read
 * marked it again a second later. Measured, the window is about as long as the
 * gap between two clicks: the collect POST is ~650 ms warm and near a second on
 * the first press after an idle gap, and the read another 260-500.
 *
 * `refoldMembership` is the fix, and it is the same idea `GroupStore.refold`
 * already applies to the review page's edits: whatever the server says, put back
 * the presses it cannot have heard about yet.
 */
describe("refolding an optimistic ✆ over a server read", () => {
  const ref = (id: string, name = id): MembershipRef => ({ id, name, status: "open" });
  const add = (orgId: string, groupId: string): PendingCollect =>
    ({ orgId, groupId, kind: "add", ref: ref(groupId) });
  const drop = (orgId: string, groupId: string): PendingCollect =>
    ({ orgId, groupId, kind: "remove", ref: ref(groupId) });

  const server: Membership = {
    openGroupId: "aug-2",
    byOrg: { a: [ref("aug-2")] },
    edited: { a: 3 },
  };

  /** The bug, in one assertion. */
  test("a church whose collect is still travelling stays collected", () => {
    const out = refoldMembership(server, [add("b", "aug-2")]);
    assert.equal(isCollecting(out, "b"), true, "the row must not un-mark mid-flight");
    assert.equal(isCollecting(out, "a"), true, "and the server's own answer survives");
  });

  /**
   * The server may already have taken it — the read that un-marked the row and
   * the read that would confirm it are the same request, arriving twice. Its copy
   * carries the real batch name, so the pending one must not be layered on top.
   */
  test("a press the server has already taken is not duplicated", () => {
    const out = refoldMembership(server, [add("a", "aug-2")]);
    assert.equal(out.byOrg.a.length, 1);
    assert.equal(out.byOrg.a[0].name, "aug-2");
  });

  test("an un-collect still travelling is not resurrected", () => {
    const out = refoldMembership(server, [drop("a", "aug-2")]);
    assert.equal(isCollecting(out, "a"), false);
    assert.ok(!("a" in out.byOrg), "the key goes, exactly as membershipFrom would leave it");
  });

  /** A church in two batches loses only the one it was un-collected from. */
  test("an un-collect touches one batch, not the church", () => {
    const both: Membership = {
      openGroupId: "aug-2",
      byOrg: { a: [ref("aug-1"), ref("aug-2")] },
      edited: {},
    };
    const out = refoldMembership(both, [drop("a", "aug-2")]);
    assert.deepEqual(out.byOrg.a.map((g) => g.id), ["aug-1"]);
  });

  /**
   * THE FIRST ✆ OF THE DAY CREATES THE BATCH, and for one round trip the server
   * still answers `openGroupId: null`. Without this the rail flashes back to
   * "Press ✆ on a church to start collecting" while a church is visibly being
   * collected into one.
   */
  test("the batch being collected into is held until the server has it", () => {
    const empty: Membership = { openGroupId: null, byOrg: {}, edited: {} };
    const out = refoldMembership(empty, [add("a", "aug-3")]);
    assert.equal(out.openGroupId, "aug-3");
    assert.equal(isCollecting(out, "a"), true);
  });

  /** …but the server's answer wins the moment it has one. */
  test("the server's own open batch is never overridden", () => {
    assert.equal(refoldMembership(server, [add("b", "aug-9")]).openGroupId, "aug-2");
  });

  /**
   * The common path is nothing in flight, and it must cost nothing: a fresh
   * object every read would re-render twenty memoised rows for no change.
   */
  test("with nothing in flight the server's answer is passed through untouched", () => {
    assert.equal(refoldMembership(server, []), server, "the same object, not a copy");
  });

  test("everything else on the payload is left alone", () => {
    const out = refoldMembership(server, [add("b", "aug-2")]);
    assert.deepEqual(out.edited, { a: 3 }, "edit counts are the server's to report");
  });
});
