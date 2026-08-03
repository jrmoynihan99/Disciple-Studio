import { NextResponse } from "next/server";
import { getGroup, deleteGroup, slugsHeldElsewhere } from "@/lib/groups";
import { deleteChurch } from "@/churches";

export const dynamic = "force-dynamic";

/** GET /api/groups/[id] — the full group (rows included). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const group = await getGroup(id);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(group);
}

/**
 * DELETE /api/groups/[id] — remove the group and the demos ONLY IT serves.
 *
 * A demo listed here is not necessarily this group's to delete: re-exporting a
 * church reuses its slug on purpose, so a newer group can be serving the same
 * `/c/<slug>`. See `slugsHeldElsewhere`, which is also what decides the same
 * question for a single row.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const group = await getGroup(id);
  let kept = 0;
  if (group) {
    const shared = await slugsHeldElsewhere(id);
    // `null` is "could not tell". Deleting nothing leaves demos with no group,
    // which is a tidy-up; deleting a shared one breaks a link already sent.
    const mine = shared ? group.rows.filter((r) => !shared.has(r.slug)) : [];
    kept = group.rows.length - mine.length;
    await Promise.all(mine.map((r) => deleteChurch(r.slug).catch(() => {})));
  }
  try {
    await deleteGroup(id);
  } catch {
    /* already gone — treat as success */
  }
  return NextResponse.json({ ok: true, demosKept: kept });
}
