import { getUserId } from "@/lib/leads/server/userId";
import { markExported, summarize } from "@/lib/leads/server/groups";
import { isSafeGroupId } from "@/lib/leads/engine/group-types";

/**
 * The batch went out. Record what it produced.
 *
 * SEPARATE FROM THE PER-CHURCH ROUTE ON PURPOSE. A batch becomes history only
 * once there is a demo group to point at, so the client calls this last, after
 * `POST /api/groups` has minted the id. Marking each church exported as it landed
 * would leave a half-exported batch in a state with no meaning — sent, but with
 * nowhere to send anyone.
 *
 * Storing `demoGroupId` is the only link between a reviewed batch and its demos:
 * the demo group's id carries a random suffix, so it cannot be recomputed.
 */

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(req: Request, ctx: Ctx) {
  const userId = await getUserId();
  if (!userId) return bad("No identity cookie. Reload to obtain one.", 401);

  const { id } = await ctx.params;
  if (!isSafeGroupId(id)) return bad("Not a group id", 404);

  let body: { demoGroupId?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const demoGroupId = typeof body.demoGroupId === "string" ? body.demoGroupId.trim() : "";
  // Without it this would mark a batch sent with no way back to what it sent —
  // the one thing this route exists to write down.
  if (!demoGroupId) return bad("demoGroupId is required");

  try {
    return Response.json(summarize(await markExported(userId, id, demoGroupId)));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not finish the export";
    return bad(message, /no batch named/.test(message) ? 404 : 500);
  }
}
