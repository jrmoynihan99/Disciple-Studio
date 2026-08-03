import { NextResponse } from "next/server";
import { getGroup, saveGroup, slugsHeldElsewhere } from "@/lib/groups";
import { deleteChurch } from "@/churches";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/groups/[id]/demos/[slug] — remove one demo from a group: prune its
 * row so the group and its spreadsheet stay in sync, and delete the church blob
 * IF NO OTHER GROUP IS SERVING IT. No-op (still ok) if either is already gone.
 *
 * The share check matters more here than on the whole-group delete, because this
 * is the likelier way in: one careless row delete from the `/studio` index, where
 * nothing on screen says the demo is also listed somewhere else. See
 * `slugsHeldElsewhere` for why two groups can hold one slug at all.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; slug: string }> },
) {
  const { id, slug } = await params;

  const shared = await slugsHeldElsewhere(id);
  // `null` is "could not read the other groups", and an unprovable delete is
  // not performed: the row still goes, so this group stops listing it.
  const demoKept = !shared || shared.has(slug);
  if (!demoKept) await deleteChurch(slug).catch(() => {});

  const group = await getGroup(id);
  if (group) {
    const before = group.rows.length;
    group.rows = group.rows.filter((r) => r.slug !== slug);
    if (group.rows.length !== before) {
      try {
        await saveGroup(group);
      } catch {
        return NextResponse.json({ error: "Could not update group" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    remaining: group ? group.rows.length : 0,
    demoKept,
  });
}
