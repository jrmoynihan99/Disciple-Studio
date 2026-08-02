import { getUserId } from "@/lib/leads/server/userId";
import { readGroup, removeGroup, writeGroup } from "@/lib/leads/server/groups";
import { applyOps, sanitizeOp } from "@/lib/leads/engine/group";
import { isSafeGroupId } from "@/lib/leads/engine/group-types";
import type { GroupOp } from "@/lib/leads/engine/group-types";

/**
 * One export group: read it, fold edits into it, delete it.
 *
 * PATCH TAKES OPERATIONS, NEVER A SNAPSHOT. Three reasons that all point the
 * same way:
 *
 *  - the client's last-chance save runs on `pagehide` with `keepalive`, and the
 *    Fetch spec caps keepalive bodies at 64 KiB. A 40-church group is ~210 KB, so
 *    sending the group back would SILENTLY fail to save on anything but the
 *    smallest groups — the exact failure mode this system calls its worst;
 *  - a minute of typing costs ~30 KB instead of ~3 MB;
 *  - a snapshot the client cannot send is a snapshot the client cannot forge, so
 *    "this text came from the pipeline" stays true by construction.
 */

export const dynamic = "force-dynamic";

const bad = (msg: string, status = 400) => Response.json({ error: msg }, { status });

async function requireUser(): Promise<string | Response> {
  const id = await getUserId();
  return id ?? bad("No identity cookie. Reload to obtain one.", 401);
}

// The explicit params form rather than `RouteContext<'…'>`: the typegen helper
// is only written during `next dev`/`build`, so a brand-new route annotated that
// way fails `tsc --noEmit` on a clean tree until something has generated it.
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const userId = await requireUser();
  if (typeof userId !== "string") return userId;

  const { id } = await ctx.params;
  if (!isSafeGroupId(id)) return bad("Not a group id", 404);

  const group = await readGroup(userId, id);
  if (!group) return bad(`No group named ${id}`, 404);
  return Response.json(group, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const userId = await requireUser();
  if (typeof userId !== "string") return userId;

  const { id } = await ctx.params;
  if (!isSafeGroupId(id)) return bad("Not a group id", 404);

  let body: { ops?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }
  if (!Array.isArray(body.ops)) return bad("Expected an ops array");
  if (body.ops.length > 500) return bad("Too many operations in one flush");

  // Every op is narrowed before it runs. The path and the item id are keys into
  // stored state, so neither may be whatever arrived over the wire — the same
  // rule `groups.ts` applies to a user id it is about to put in a storage key.
  const ops: GroupOp[] = [];
  for (const raw of body.ops) {
    const op = sanitizeOp(raw);
    if (!op) return bad("Rejected an operation this endpoint does not accept");
    ops.push(op);
  }

  const group = await readGroup(userId, id);
  if (!group) return bad(`No group named ${id}`, 404);

  const now = Date.now();
  const next = applyOps(group, ops, now);
  next.updatedAt = new Date(now).toISOString();
  // Observability only. Nothing is ever rejected on it: Blob has no CAS, so a
  // rev check would fail in its design case and discard buffered typing when it
  // did fire. A second tab is kept coherent by BroadcastChannel instead.
  next.rev = (group.rev ?? 0) + 1;

  try {
    await writeGroup(userId, next);
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not save your changes", 500);
  }
  return Response.json({ ok: true, rev: next.rev, updatedAt: next.updatedAt });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const userId = await requireUser();
  if (typeof userId !== "string") return userId;

  const { id } = await ctx.params;
  if (!isSafeGroupId(id)) return bad("Not a group id", 404);

  try {
    await removeGroup(userId, id);
  } catch {
    return bad("Could not delete the group", 500);
  }
  return Response.json({ ok: true });
}
