import { NextResponse } from "next/server";
import { getGroup, deleteGroup } from "@/lib/groups";

export const dynamic = "force-dynamic";

/** GET /api/groups/[id] — the full group (rows included). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const group = await getGroup(id);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(group);
}

/** DELETE /api/groups/[id] — remove the group (the demos it created are left). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteGroup(id);
  } catch {
    /* already gone — treat as success */
  }
  return NextResponse.json({ ok: true });
}
