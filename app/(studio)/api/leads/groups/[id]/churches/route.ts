import { getUserId } from "@/lib/leads/server/userId";
import { readGroup, writeGroup } from "@/lib/leads/server/groups";
import { buildEntry } from "@/lib/leads/engine/snapshot";
import { statusOf } from "@/lib/leads/engine/group";
import { isSafeGroupId } from "@/lib/leads/engine/group-types";
import { getCurrent, getIndex, getRecord } from "@/lib/leads/server/dataset";
import type { GroupEntry } from "@/lib/leads/engine/group-types";

/**
 * Add churches to a group — which means freezing them.
 *
 * The snapshot is built HERE rather than in the browser, for three reasons:
 * adding 40 churches would otherwise be 40 client round-trips of ~13 KB each;
 * the `_synthetic` refusal belongs somewhere the caller cannot skip; and a
 * snapshot the client never touches is one it cannot rewrite.
 *
 * NOTHING HERE MARKS A CHURCH AS SENT. Adding one to a batch is not exporting
 * it, and ◎ is only evidence for as long as nothing but a real export can set
 * it. That is now structural rather than a rule to remember: the mark is
 * `wasSent()`, folded from a batch's `status`, and the only thing that writes
 * that status is `export/finish` — after the demos exist.
 */

export const dynamic = "force-dynamic";

/** One request builds at most this many snapshots. */
const MAX_ADD = 200;

const bad = (msg: string, status = 400) => Response.json({ error: msg }, { status });

async function requireUser(): Promise<string | Response> {
  const id = await getUserId();
  return id ?? bad("No identity cookie. Reload to obtain one.", 401);
}

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const userId = await requireUser();
  if (typeof userId !== "string") return userId;

  const { id } = await ctx.params;
  if (!isSafeGroupId(id)) return bad("Not a group id", 404);

  let body: { ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }
  if (!Array.isArray(body.ids)) return bad("Expected an ids array");

  const ids = [...new Set(body.ids.filter((v): v is string => typeof v === "string"))];
  if (!ids.length) return bad("No churches to add");
  if (ids.length > MAX_ADD) return bad(`Add at most ${MAX_ADD} churches at a time`);

  const group = await readGroup(userId, id);
  if (!group) return bad(`No group named ${id}`, 404);

  /**
   * NOTHING GOES INTO A BATCH THAT HAS ALREADY BEEN SENT.
   *
   * The demos are built from the entries that existed at export time, so a
   * church added afterwards would sit in the batch for ever with no demo and no
   * way to get one — the export refuses a sent batch. The console never offers
   * this (`✆` targets the current batch, and an exported batch cannot be the
   * current one), so this closes the direct call rather than a path through the
   * UI. Same reasoning as the `PATCH` refusal in the parent route.
   */
  if (statusOf(group) === "exported") {
    return bad("This batch has been sent. Nothing more can be collected into it.", 409);
  }

  const [index, pointer] = await Promise.all([getIndex(), getCurrent()]);
  const byId = new Map(index.map((r) => [r.id, r]));
  const already = new Set(group.entries.map((e) => e.orgId));

  const added: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  const entries: GroupEntry[] = [];
  const now = Date.now();

  for (const orgId of ids) {
    // Re-adding must never re-snapshot: the existing card may carry an hour of
    // corrections, and silently replacing it would throw them away.
    if (already.has(orgId)) {
      skipped.push({ id: orgId, reason: "already in this group" });
      continue;
    }
    const row = byId.get(orgId);
    if (!row) {
      skipped.push({ id: orgId, reason: "not in the current dataset" });
      continue;
    }
    const record = await getRecord(orgId);
    if (!record) {
      skipped.push({ id: orgId, reason: "record could not be read" });
      continue;
    }
    try {
      entries.push(buildEntry(row, record, pointer.publish_id, now));
      added.push(orgId);
    } catch (e) {
      // Includes the synthetic refusal. A church that quietly fails to arrive is
      // the same class of error as asserting absence, so it is always reported.
      skipped.push({ id: orgId, reason: e instanceof Error ? e.message : "could not be snapshotted" });
    }
  }

  if (entries.length) {
    const next = {
      ...group,
      entries: [...group.entries, ...entries],
      updatedAt: new Date(now).toISOString(),
      rev: (group.rev ?? 0) + 1,
    };
    try {
      await writeGroup(userId, next);
    } catch (e) {
      return bad(e instanceof Error ? e.message : "Could not save the group", 500);
    }
  }

  return Response.json({ ok: true, added, skipped, count: group.entries.length + entries.length });
}
