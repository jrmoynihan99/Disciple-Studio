import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  PUSHPAY_CHURCHES,
  churchKey,
  refreshTokens,
  safeEqual,
} from "@/lib/pushpay/broker";

export const dynamic = "force-dynamic";

/**
 * POST /api/pushpay/refresh — token-refresh proxy for church backends.
 *
 * Pushpay access tokens are short-lived (expires_in ~1 hour) and refreshing
 * needs the vendor client_secret, which only this deployment holds. A church
 * backend POSTs { church, refresh_token } with its shared broker key
 * (x-broker-key) and gets Pushpay's token response passed straight through —
 * the broker stores nothing.
 *
 * Not behind the studio basic-auth middleware: machine-to-machine, keyed
 * per church, fails closed when the church's key env var is unset.
 */
export async function POST(req: NextRequest) {
  let body: { church?: string; refresh_token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const church = PUSHPAY_CHURCHES[body.church ?? ""];
  if (!church) {
    return NextResponse.json({ error: "unknown_church" }, { status: 404 });
  }

  const key = churchKey(church);
  const given = req.headers.get("x-broker-key") ?? "";
  if (!key || !given || !safeEqual(given, key)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!body.refresh_token) {
    return NextResponse.json({ error: "missing_refresh_token" }, { status: 400 });
  }

  const resp = await refreshTokens(body.refresh_token);
  const text = await resp.text();
  if (!resp.ok) {
    // Pass Pushpay's status through (400/401 here usually means a revoked or
    // already-rotated refresh token — the church backend decides what to do).
    console.error(`Pushpay refresh failed for ${church.slug}: ${resp.status}`);
    return new NextResponse(text || JSON.stringify({ error: "refresh_failed" }), {
      status: resp.status,
      headers: {
        "content-type": resp.headers.get("content-type") ?? "application/json",
      },
    });
  }
  return new NextResponse(text, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
