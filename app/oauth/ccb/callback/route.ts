import type { NextRequest } from "next/server";
import { resultPage } from "@/lib/oauth/result-page";
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

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  // The admin clicked "deny" (or CCB reported another authorize-step error).
  if (params.get("error")) {
    return resultPage(
      false,
      "Authorization declined",
      "No changes were made — your Church Community Builder data was not shared. If this was a mistake, open the consent link again.",
    );
  }

  const church = verifyState(params.get("state") ?? "");
  if (!church) {
    return resultPage(
      false,
      "This link is invalid or has expired",
      "Consent links expire after a few days. Ask Disciple Studio for a fresh link and try again.",
    );
  }

  const code = params.get("code");
  if (!code) {
    return resultPage(
      false,
      "Missing authorization code",
      "Church Community Builder didn't return an authorization code. Open the consent link and try again.",
    );
  }

  const deliveryKey = churchKey(church);
  if (!deliveryKey) {
    console.error(`CCB callback: ${church.keyEnv} is not set — cannot deliver tokens.`);
    return resultPage(
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
      return resultPage(
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
      return resultPage(
        false,
        "Almost there — delivery failed",
        `Your approval went through, but handing the connection to ${church.displayName}'s system failed. Open the consent link and approve one more time.`,
      );
    }

    return resultPage(
      true,
      "Connected!",
      `${church.displayName}'s Church Community Builder account is now linked to Disciple Studio. You can close this tab.`,
    );
  } catch (err) {
    console.error(`CCB callback error for ${church.slug}:`, err);
    return resultPage(
      false,
      "Something went wrong",
      "An unexpected error interrupted the connection. Open the consent link and try again.",
    );
  }
}