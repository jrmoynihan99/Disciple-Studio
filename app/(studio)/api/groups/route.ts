import { NextResponse } from "next/server";
import { getAllGroups, saveGroup, makeGroupId, type Group, type GroupRow } from "@/lib/groups";

export const dynamic = "force-dynamic";

const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

/** GET /api/groups — summary list of all import groups (newest first). */
export async function GET() {
  return NextResponse.json(await getAllGroups());
}

/**
 * POST /api/groups — persist a finished import as a group.
 * Body: { name, genericLink, rows: GroupRow[] }. Returns { id }.
 */
export async function POST(req: Request) {
  let body: { name?: string; genericLink?: string; rows?: GroupRow[] };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const name = (body.name ?? "").trim();
  if (!name) return bad("Group needs a name");
  if (!Array.isArray(body.rows)) return bad("Group needs rows");

  // A short, deterministic-enough suffix from the current time (server-side).
  const suffix = Date.now().toString(36).slice(-5);
  const group: Group = {
    id: makeGroupId(name, suffix),
    name,
    genericLink: (body.genericLink ?? "").trim(),
    createdAt: new Date().toISOString(),
    rows: body.rows,
  };

  try {
    await saveGroup(group);
  } catch {
    return bad("Could not save group", 500);
  }
  return NextResponse.json({ ok: true, id: group.id });
}
