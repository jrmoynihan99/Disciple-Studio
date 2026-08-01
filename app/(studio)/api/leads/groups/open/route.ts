import { getUserId } from "@/lib/leads/server/userId";
import { openGroup, summarize } from "@/lib/leads/server/groups";

/**
 * The batch ✆ collects into, created on demand.
 *
 * POST rather than GET because it can create. The first click on a fresh console
 * lands here and gets back a date-named batch — which is the whole point: nobody
 * has to invent a name for work they have not done yet.
 */

export const dynamic = "force-dynamic";

export async function POST() {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: "No identity cookie. Reload to obtain one." }, { status: 401 });
  }
  try {
    return Response.json(summarize(await openGroup(userId)));
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not open a batch" },
      { status: 500 },
    );
  }
}
