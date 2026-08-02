import { getUserId } from "@/lib/leads/server/userId";
import { listGroups, startBatch } from "@/lib/leads/server/groups";

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

  /**
   * AN EMPTY NAME IS NOT AN ERROR ANY MORE — it means "you name it".
   *
   * This used to 400, on the reasonable theory that a group without a name is a
   * group nobody can find again. What made it wrong is the picker's `＋ New
   * batch`: the only thing it could do was open a text prompt before you had
   * collected anything to name, which is precisely the ceremony `openGroup` was
   * built to avoid ("a person never makes a group: they start collecting, and the
   * group is what that turns out to have been").
   *
   * So an omitted name falls through to the same `nextBatchName` rule ✆ uses, and
   * a batch made from the picker is indistinguishable from one made by
   * collecting. A name that was SUPPLIED is still honoured verbatim.
   */
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";

  // Creating a batch STARTS one: whatever was being collected into is closed, so
  // ✆ never has two places it could put a church.
  try {
    const group = await startBatch(userId, name);
    return Response.json({ ok: true, id: group.id, name: group.name });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not create the group", 500);
  }
}
