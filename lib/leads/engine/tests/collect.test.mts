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
import { applyOp, membershipFrom, sanitizeOp } from "../group.ts";
import {
  EMPTY_MEMBERSHIP,
  earlierBatches,
  isCollecting,
  type ExportGroup,
  type GroupEntry,
  type GroupStatus,
  type Membership,
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

describe("finishing a batch", () => {
  const open = group("aug-2", "Aug 2", "open", ["a"]);

  /**
   * `closed`, not `exported`. Nothing was sent, and ◎ — the only defence against
   * contacting a church twice — must never be a claim anyone can set by pressing
   * a button. This is the same rule that killed the old stub export.
   */
  test("closing says you stopped collecting, never that you sent it", () => {
    const out = applyOp(open, { op: "group.close" }, 1_700_000_000_000);
    assert.equal(out.status, "closed");
    assert.ok(out.closedAt, "a finished batch records when");
    assert.notEqual(out.status, "exported");
  });

  test("closing twice changes nothing, and a sent batch is not reopened", () => {
    const once = applyOp(open, { op: "group.close" }, 1000);
    assert.deepEqual(applyOp(once, { op: "group.close" }, 2000), once);

    const sent = group("aug-1", "Aug 1", "exported", []);
    assert.equal(applyOp(sent, { op: "group.close" }, 3000).status, "exported");
  });

  test("a closed batch is no longer the collect target", () => {
    const closed = applyOp(open, { op: "group.close" }, 1000);
    assert.equal(membershipFrom([closed]).openGroupId, null);
    assert.equal(isCollecting(membershipFrom([closed]), "a"), false);
    assert.deepEqual(
      earlierBatches(membershipFrom([closed]), "a").map((g) => g.status),
      ["closed"],
      "yesterday's work becomes history the moment you finish it",
    );
  });

  test("`group.close` survives the wire", () => {
    assert.deepEqual(sanitizeOp({ op: "group.close" }), { op: "group.close" });
    assert.equal(sanitizeOp({ op: "group.open" }), null);
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
