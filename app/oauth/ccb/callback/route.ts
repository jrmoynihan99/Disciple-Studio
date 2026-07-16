import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  churchKey,
  exchangeCode,
  verifyState,
  type CcbTokenResponse,
} from "@/lib/ccb/broker";

export const dynamic = "force-dynamic";

/**
 * GET /oauth/ccb/callback — where CCB sends a church admin's browser after
 * they approve (or decline) the consent screen. This URL is registered with
 * Pushpay as the vendor app's redirect URI, so it is one shared landing spot
 * for every client church; the signed `state` tells us which church this is.
 *
 * PUBLIC route (no middleware gate): the visitor is a church admin, not us.
 * On success we exchange the code with CCB (authorization codes are
 * short-lived, which is why this is automated) and deliver the tokens
 * server-to-server to the church's own backend. Nothing is stored here.
 */

function page(ok: boolean, title: string, message: string) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — Disciple Studio</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
         background: #0c0a09; color: #fafaf9;
         font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  .card { max-width: 26rem; margin: 1.5rem; padding: 2.5rem 2.25rem; text-align: center;
          background: #1c1917; border: 1px solid #292524; border-radius: 1rem; }
  .badge { width: 3rem; height: 3rem; margin: 0 auto 1.25rem; display: grid; place-items: center;
           border-radius: 9999px; font-size: 1.4rem;
           background: ${ok ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.15)"};
           color: ${ok ? "#34d399" : "#f87171"}; }
  h1 { font-size: 1.15rem; margin: 0 0 .6rem; }
  p { font-size: .92rem; line-height: 1.55; color: #a8a29e; margin: 0; }
  .brand { margin-top: 1.75rem; font-size: .75rem; letter-spacing: .08em;
           text-transform: uppercase; color: #57534e; }
</style>
</head>
<body>
  <main class="card">
    <div class="badge">${ok ? "✓" : "✕"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="brand">Disciple Studio</div>
  </main>
</body>
</html>`;
  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  // The admin clicked "deny" (or CCB reported another authorize-step error).
  if (params.get("error")) {
    return page(
      false,
      "Authorization declined",
      "No changes were made — your Church Community Builder data was not shared. If this was a mistake, open the consent link again.",
    );
  }

  const church = verifyState(params.get("state") ?? "");
  if (!church) {
    return page(
      false,
      "This link is invalid or has expired",
      "Consent links expire after a few days. Ask Disciple Studio for a fresh link and try again.",
    );
  }

  const code = params.get("code");
  if (!code) {
    return page(
      false,
      "Missing authorization code",
      "Church Community Builder didn't return an authorization code. Open the consent link and try again.",
    );
  }

  const deliveryKey = churchKey(church);
  if (!deliveryKey) {
    console.error(`CCB callback: ${church.keyEnv} is not set — cannot deliver tokens.`);
    return page(
      false,
      "Broker not fully configured",
      `The connection for ${church.displayName} isn't finished being set up on our side. Contact Disciple Studio and try again afterwards.`,
    );
  }

  try {
    const exchange = await exchangeCode(church, code);
    if (!exchange.ok) {
      console.error(
        `CCB code exchange failed for ${church.slug}: ${exchange.status} ${await exchange
          .text()
          .catch(() => "")}`,
      );
      return page(
        false,
        "Connection failed",
        `Church Community Builder rejected the authorization (status ${exchange.status}). Open the consent link and approve again; if it keeps failing, contact Disciple Studio.`,
      );
    }
    const tokens = (await exchange.json()) as CcbTokenResponse;

    const delivery = await fetch(church.storeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-broker-key": deliveryKey,
      },
      body: JSON.stringify({
        church: church.slug,
        subdomain: church.subdomain,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        scope: tokens.scope ?? "",
      }),
    });
    if (!delivery.ok) {
      console.error(
        `CCB token delivery to ${church.slug} failed: ${delivery.status} ${await delivery
          .text()
          .catch(() => "")}`,
      );
      return page(
        false,
        "Almost there — delivery failed",
        `Your approval went through, but handing the connection to ${church.displayName}'s system failed. Open the consent link and approve one more time.`,
      );
    }

    return page(
      true,
      "Connected!",
      `${church.displayName}'s Church Community Builder account is now linked to Disciple Studio. You can close this tab.`,
    );
  } catch (err) {
    console.error(`CCB callback error for ${church.slug}:`, err);
    return page(
      false,
      "Something went wrong",
      "An unexpected error interrupted the connection. Open the consent link and try again.",
    );
  }
}