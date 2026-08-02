import { getUserId } from "@/lib/leads/server/userId";
import { reopenGroup, summarize } from "@/lib/leads/server/groups";
import { isSafeGroupId } from "@/lib/leads/engine/group-types";

/**
 * Point ✆ at this batch.
 *
 * Sibling of `POST /api/leads/groups/open`, which creates one. That route answers
 * "where do churches go?" and makes a batch if there is no answer yet; this one
 * changes the answer to a batch that already exists.
 *
 * The refusal case — an already-sent batch — is enforced in `reopenGroup` rather
 * than here, because it is a fact about the batch and not about the request.
 */

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: "No identity cookie. Reload to obtain one." }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!isSafeGroupId(id)) return Response.json({ error: "Not a group id" }, { status: 404 });

  try {
    return Response.json(summarize(await reopenGroup(userId, id)));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not switch batch";
    // A batch that is gone is a 404; one that has been sent is a refusal, and the
    // two are different problems for whoever is looking at the picker.
    return Response.json({ error: message }, { status: /no batch named/.test(message) ? 404 : 409 });
  }
}
