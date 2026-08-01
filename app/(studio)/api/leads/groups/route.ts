import { getUserId } from "@/lib/leads/server/userId";
import { listGroups, writeGroup } from "@/lib/leads/server/groups";
import { makeExportGroupId } from "@/lib/leads/engine/group";
import { GROUP_SCHEMA_VERSION } from "@/lib/leads/engine/group-types";
import type { ExportGroup } from "@/lib/leads/engine/group-types";

/**
 * Export groups, listed and created.
 *
 * Gated by `proxy.ts` via the existing `/api/leads/:path*` matcher — no new entry
 * needed, which is worth stating because the matcher's own comment warns that a
 * route group adds no URL segment and an unlisted route ships open.
 */

export const dynamic = "force-dynamic";

const bad = (msg: string, status = 400) => Response.json({ error: msg }, { status });

/**
 * The identity is read from the signed cookie and nowhere else. It decides which
 * blobs the caller may write, so accepting it from a body or a header would make
 * "one logical writer per blob" a comment rather than a property.
 */
async function requireUser(): Promise<string | Response> {
  const id = await getUserId();
  return id ?? bad("No identity cookie. Reload to obtain one.", 401);
}

export async function GET() {
  const userId = await requireUser();
  if (typeof userId !== "string") return userId;
  try {
    return Response.json(await listGroups(userId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return bad("Could not read your groups", 503);
  }
}

export async function POST(req: Request) {
  const userId = await requireUser();
  if (typeof userId !== "string") return userId;

  let body: { name?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (!name) return bad("A group needs a name");

  const now = new Date().toISOString();
  const group: ExportGroup = {
    schema: GROUP_SCHEMA_VERSION,
    id: makeExportGroupId(name, Date.now().toString(36).slice(-5)),
    userId,
    name,
    createdAt: now,
    updatedAt: now,
    rev: 0,
    entries: [],
  };

  try {
    await writeGroup(userId, group);
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not create the group", 500);
  }
  return Response.json({ ok: true, id: group.id, name: group.name });
}
