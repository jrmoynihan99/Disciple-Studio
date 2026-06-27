import { get } from "@vercel/blob";

export const dynamic = "force-dynamic";

/**
 * GET /api/asset/logos/... — public proxy for uploaded logos.
 *
 * Logos are stored as PRIVATE blobs (same store/access as the church configs).
 * This route reads them server-side via the authenticated SDK and streams them
 * back, so a plain <img src> on a demo page works without exposing the blob
 * store. Restricted to the `logos/` prefix so it can never serve church configs
 * (which live under `churches/` and are the demo's only access control).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathname = (path ?? []).join("/");

  if (!pathname.startsWith("logos/")) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const result = await get(pathname, { access: "private" });
    if (!result?.stream) return new Response("Not found", { status: 404 });
    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
