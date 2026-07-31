import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  USER_COOKIE,
  USER_COOKIE_MAX_AGE,
  identitySecret,
  mintUserId,
  signUserId,
  verifyUserToken,
} from "@/lib/leads/identity";

/**
 * HTTP Basic Auth gate for the demo studio.
 *
 * Protects the builder (/admin), the internal index (/studio), the demo CRUD API
 * (/api/churches), and the Lead Console (/leads, /api/leads). The personalized
 * demos at /c/<slug> stay PUBLIC — recipients open their demo without a password
 * (that's the whole pitch) — and the marketing site is untouched.
 *
 * The password comes from the STUDIO_PASSWORD env var (set it in Vercel and in
 * .env.local for local dev). Username defaults to "admin", overridable via
 * STUDIO_USER. If STUDIO_PASSWORD is unset we fail closed (always 401) so the
 * tooling can never be exposed by a missing env var.
 *
 * On success we also ensure a signed, opaque per-device id cookie exists. See
 * `lib/leads/identity.ts` for what that is and — more importantly — what it is
 * not. Every other gated route ignores it; an extra Set-Cookie is harmless.
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

/**
 * Mint the per-device id if the request doesn't already carry a valid one.
 *
 * Re-signs nothing: a cookie that verifies is left completely alone, so the id
 * is stable for the life of the cookie and the Set-Cookie header only appears on
 * a first visit (or after a secret rotation).
 */
function ensureUserId(req: NextRequest, res: NextResponse) {
  const secret = identitySecret();
  if (!secret) return;

  const existing = verifyUserToken(req.cookies.get(USER_COOKIE)?.value, secret);
  if (existing) return;

  res.cookies.set(USER_COOKIE, signUserId(mintUserId(), secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: USER_COOKIE_MAX_AGE,
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
        const res = NextResponse.next();
        ensureUserId(req, res);
        return res;
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
    // The Lead Console. Route groups add no URL segment, so `app/(studio)/leads/`
    // serves at `/leads` and is NOT covered by the entries above — it has to be
    // named here explicitly or it ships open. What it serves is real customer
    // data: names, emails and phone numbers of actual congregations.
    "/leads/:path*",
    "/api/leads/:path*",
    "/api/churches/:path*",
    "/api/import/:path*",
    "/api/groups/:path*",
    "/api/ccb/consent-link",
    "/api/pushpay/consent-link",
  ],
};