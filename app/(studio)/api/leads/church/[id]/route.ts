import { getRecord } from "@/lib/leads/server/dataset";

/**
 * GET /api/leads/church/<org_id>
 *
 * One full record — ~13 KB, fetched only when a dossier opens. This is where the
 * quotes and source URLs live; the slim index deliberately carries neither, so
 * it can never assert an answer to a human beyond a colour and a label.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/leads/church/[id]">) {
  const { id } = await ctx.params;
  const record = await getRecord(id);

  if (!record) {
    return Response.json({ error: `no record for ${id}` }, { status: 404 });
  }

  // Never serve the fabricated edge-case records as though they were churches.
  if (record._synthetic) {
    return Response.json({ error: "synthetic record" }, { status: 404 });
  }

  return Response.json(record, {
    // Keyed by org_id rather than by content hash today, so it is revalidated
    // rather than cached forever. At M5 the client caches by the record's `rec`
    // sha, which survives a republish that did not change this church.
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
