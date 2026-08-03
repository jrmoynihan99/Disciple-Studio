import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
 * THIS IS THE ONLY THING DECIDING ACCESS. It used to also mint a signed
 * per-device id cookie for the Lead Console, so that each browser wrote its own
 * batches. The console is now a single shared workspace — one login, one set of
 * batches — so there is no per-device id to mint and nothing to sign. See
 * `lib/leads/identity.ts` for why, and what it costs.
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
      if (user === EXPECTED_USER && pass === expectedPassword) return NextResponse.next();
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
    // `/api/import/:path*` was here and its route is gone — the folder importer
    // was replaced by exporting a reviewed batch. Left OUT rather than kept "just
    // in case": a matcher entry for a route that does not exist is a claim about
    // coverage that nothing can check, and the day somebody re-adds an
    // `/api/import` they should have to decide whether it is gated.
    "/api/groups/:path*",
    /**
     * The logo uploader. It serves no church data, which is why it was missed —
     * but it is a WRITE, and the thing it writes to is the store whose
     * advanced-operation allowance being exhausted "suspended this store once
     * already and took the live demos down with it" (see `lib/logo.ts`). Nothing
     * in this codebase ever deletes a logo, so an unauthenticated POST loop is a
     * one-way ratchet towards that outage.
     *
     * Safe to gate: the only caller is `/admin`, which is already behind this
     * same matcher. `/api/asset` — the public READ side — is deliberately not
     * here, because `/c/<slug>` has to serve logos to a church with no password.
     */
    "/api/upload/:path*",
    "/api/ccb/consent-link",
    "/api/pushpay/consent-link",
  ],
};