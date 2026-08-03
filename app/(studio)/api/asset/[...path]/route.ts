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
/**
 * A path segment that cannot be part of a logo key.
 *
 * `logos/<sha256>.<ext>` is the only shape this route may ever serve, so a
 * segment containing a slash or a dot-dot is not a stricter rule — it is a
 * segment that could not have come from a logo URL at all.
 */
const ESCAPES = (seg: string) => seg.includes("/") || seg.includes("\\") || seg.includes("..");

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const segments = path ?? [];

  /**
   * CHECK THE SEGMENTS, NOT THE JOINED STRING — this route is public, and the
   * prefix test below was the whole of its access control.
   *
   * `startsWith("logos/")` ran against `segments.join("/")`, and a URL-ENCODED
   * slash keeps `..` inside a SINGLE segment, so Next never normalises it away.
   * The joined string still began with `logos/`, passed, and the Blob SDK then
   * resolved the `..` while concatenating the storage URL. Reproduced against
   * the running server with no credentials:
   *
   *   GET /api/asset/logos%2F..%2Fchurches/central-church.json   -> 200, a full
   *       ChurchConfig — and the slug IS the public /c/<slug> link posted to the
   *       congregation, so no guessing is needed.
   *   GET /api/asset/logos%2F..%2Fgroups/<id>.json               -> 200, an
   *       export group: staff names, job titles, email addresses, phone numbers.
   *
   * The unencoded form 404s, which is why this survived: every obvious probe of
   * the traversal looks safe. `proxy.ts` deliberately leaves this route open so
   * `/c/<slug>` can show a logo to a church with no password, so there was no
   * second gate behind it.
   */
  if (segments.some(ESCAPES)) return new Response("Not found", { status: 404 });

  const pathname = segments.join("/");
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
