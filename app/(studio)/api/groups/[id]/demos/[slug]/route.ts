import { NextResponse } from "next/server";
import { getGroup, saveGroup } from "@/lib/groups";
import { deleteChurch } from "@/churches";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/groups/[id]/demos/[slug] — remove one demo from a group: delete
 * the church blob and prune its row so the group and its spreadsheet stay in
 * sync. No-op (still ok) if either is already gone.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; slug: string }> },
) {
  const { id, slug } = await params;

  await deleteChurch(slug).catch(() => {});

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

  return NextResponse.json({ ok: true, remaining: group ? group.rows.length : 0 });
}
