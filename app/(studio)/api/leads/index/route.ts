import { getIndexGz } from "@/lib/leads/server/dataset";

/**
 * GET /api/leads/index?publish=<publish_id>
 *
 * The slim index — every church, ~170 B gzipped each. This is the one big
 * download, and it is what lets filtering, facet counts, favor re-scoring and
 * the histogram be instant over the whole corpus instead of a round trip per
 * keystroke.
 *
 * A publish is immutable, so once the client has one it never needs it again;
 * the `publish` query param is what makes that cacheable.
 *
 * THE GZIP BYTES ARE FORWARDED, NOT REBUILT. The pack and the publish both store
 * the index already compressed, and the browser is going to parse JSON either
 * way — so parsing 12.6 MB server-side only to hand `Response.json` the same
 * objects back was the largest avoidable cost in the request path. Declaring the
 * encoding by hand is what makes that safe: `Response` will not re-compress a
 * body it has been told is already compressed.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const publish = new URL(req.url).searchParams.get("publish");
  try {
    const gz = await getIndexGz();
    return new Response(new Uint8Array(gz), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Encoding": "gzip",
        // Immutable only when addressed by publish id. Without one we cannot
        // promise the bytes will not change, so we do not.
        "Cache-Control": publish ? "private, max-age=31536000, immutable" : "no-store",
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "index unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
