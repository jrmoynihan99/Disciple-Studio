import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * HTTP Basic Auth gate for the demo studio.
 *
 * Protects the builder (/admin), the internal index (/studio), and the demo
 * CRUD API (/api/churches). The personalized demos at /c/<slug> stay PUBLIC —
 * recipients open their demo without a password (that's the whole pitch) — and
 * the marketing site is untouched.
 *
 * The password comes from the STUDIO_PASSWORD env var (set it in Vercel and in
 * .env.local for local dev). Username defaults to "admin", overridable via
 * STUDIO_USER. If STUDIO_PASSWORD is unset we fail closed (always 401) so the
 * tooling can never be exposed by a missing env var.
 */

const EXPECTED_USER = process.env.STUDIO_USER ?? "admin";

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Disciple Studio", charset="UTF-8"',
    },
  });
}

export function proxy(req: NextRequest) {
  const expectedPassword = process.env.STUDIO_PASSWORD;
  if (!expectedPassword) return unauthorized();

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const idx = decoded.indexOf(":");
      const user = decoded.slice(0, idx);
      const pass = decoded.slice(idx + 1);
      if (user === EXPECTED_USER && pass === expectedPassword) {
        return NextResponse.next();
      }
    } catch {
      /* malformed header → fall through to 401 */
    }
  }

  return unauthorized();
}

export const config = {
  // The consent-link generators are internal tools → gated. Their siblings
  // are NOT: /api/{ccb,pushpay}/refresh authenticate themselves with a
  // per-church broker key, and /oauth/{ccb,pushpay}/callback must stay public
  // (church admins land there from the provider's consent screen).
  matcher: [
    "/admin/:path*",
    "/studio/:path*",
    "/api/churches/:path*",
    "/api/ccb/consent-link",
    "/api/pushpay/consent-link",
  ],
};