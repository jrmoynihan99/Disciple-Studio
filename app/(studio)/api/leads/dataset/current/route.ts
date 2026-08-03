import { getCurrent } from "@/lib/leads/server/dataset";

/**
 * GET /api/leads/dataset/current
 *
 * The publish pointer — the only thing in the data path that changes. Everything
 * it points at is content-addressed and immutable, which is why this is the one
 * route that must never be cached.
 *
 * The client compares `publish_id` against what it has in IndexedDB: same means
 * use the cached index with no network at all; different means fetch, verify and
 * replace.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pointer = await getCurrent();
    return Response.json(pointer, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    // Fail loudly. An empty console is indistinguishable from "no churches
    // matched your filters", and that is the one thing this product must not do.
    return Response.json(
      { error: err instanceof Error ? err.message : "dataset unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
