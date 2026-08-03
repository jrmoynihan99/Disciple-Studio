import { getAsset } from "@/lib/leads/server/dataset";

/**
 * GET /api/leads/asset/logos-thumb/<sha>.webp
 * GET /api/leads/asset/logos/<sha>.<ext>
 *
 * We serve our own copies of every logo rather than hotlinking each church's
 * CDN. Hotlinking is ~2.3 MB of third-party images per 60-row page, it breaks
 * whenever a church redesigns, and it leaks our users' IP addresses to every
 * church in the list.
 *
 * DELIBERATELY SEPARATE from the existing `/api/asset/[...path]` route. That one
 * is public (the `/c/<slug>` demos are public by design) and its `logos/` prefix
 * allowlist is its only access control. Lead logos are customer data and sit
 * behind the password, so they get their own gated path rather than a widened
 * allowlist on a public route.
 */
export const dynamic = "force-dynamic";

const KINDS = new Set(["logos", "logos-thumb"]);

const CONTENT_TYPE: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  avif: "image/avif",
  svg: "image/svg+xml",
  gif: "image/gif",
};

export async function GET(_req: Request, ctx: RouteContext<"/api/leads/asset/[...path]">) {
  const { path } = await ctx.params;
  const [kind, name, ...rest] = path ?? [];

  if (rest.length || !kind || !name || !KINDS.has(kind)) {
    return new Response("Not found", { status: 404 });
  }

  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const type = CONTENT_TYPE[ext];
  if (!type) return new Response("Not found", { status: 404 });

  const bytes = await getAsset(kind as "logos" | "logos-thumb", name);
  if (!bytes) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": type,
      // Content-addressed: the bytes at this URL can never change.
      "Cache-Control": "private, max-age=31536000, immutable",
      // A church-supplied SVG is markup; never let it run in our origin.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
