import { getUserId } from "@/lib/leads/server/userId";
import { membership } from "@/lib/leads/server/groups";

/**
 * Which batches each collected church is already in.
 *
 * The console loads this on every visit so a row can say `collected Aug 1` — the
 * thing it could not tell you at all, and the reason the same church kept
 * turning up in a second batch a week later.
 *
 * IDS ONLY. No snapshot, no quote, no contact. This is the one group response
 * that is not behind a deliberate click, so it stays the size of what has been
 * collected rather than the size of the corpus.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: "No identity cookie. Reload to obtain one." }, { status: 401 });
  }
  try {
    return Response.json(await membership(userId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // Fail loudly. An empty membership map is indistinguishable from "you have
    // never collected anything", which would quietly un-mark every row.
    return Response.json({ error: "Could not read your batches" }, { status: 503 });
  }
}
