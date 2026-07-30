import type { NextRequest } from "next/server";
import { resultPage } from "@/lib/oauth/result-page";
import {
  churchKey,
  exchangeCode,
  verifyState,
  type PushpayTokenResponse,
} from "@/lib/pushpay/broker";

export const dynamic = "force-dynamic";

/**
 * GET /oauth/pushpay/callback — where Pushpay sends a church admin's browser
 * after they approve (or decline) the Giving consent screen. This URL is
 * whitelisted with Pushpay as the vendor app's redirect URL, so it is one
 * shared landing spot for every client church; the signed `state` tells us
 * which church this is.
 *
 * PUBLIC route (no middleware gate): the visitor is a church admin, not us.
 * On success we exchange the code with Pushpay and deliver the tokens
 * server-to-server to the church's own backend. Nothing is stored here.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  // The admin clicked "deny" (or Pushpay reported another authorize-step error).
  if (params.get("error")) {
    return resultPage(
      false,
      "Authorization declined",
      "No changes were made — your Pushpay giving data was not shared. If this was a mistake, open the consent link again.",
    );
  }

  const code = params.get("code");
  if (!code) {
    return resultPage(
      false,
      "Missing authorization code",
      "Pushpay didn't return an authorization code. Open the consent link and try again.",
    );
  }

  // Pushpay's Giving docs don't document `state`, so distinguish "Pushpay
  // dropped it" (integration problem — we must switch to identifying the
  // church via the in-scope-organizations endpoint) from "bad/expired link".
  const rawState = params.get("state");
  if (!rawState) {
    console.error(
      "Pushpay callback: authorization code arrived without state — Pushpay is not round-tripping the state parameter.",
    );
    return resultPage(
      false,
      "Connection incomplete",
      "Pushpay approved the request but a technical detail is missing on our side. Contact Disciple Studio — no action is needed from you right now.",
    );
  }

  const church = verifyState(rawState);
  if (!church) {
    return resultPage(
      false,
      "This link is invalid or has expired",
      "Consent links expire after a few days. Ask Disciple Studio for a fresh link and try again.",
    );
  }

  const deliveryKey = churchKey(church);
  if (!deliveryKey) {
    console.error(
      `Pushpay callback: ${church.keyEnv} is not set — cannot deliver tokens.`,
    );
    return resultPage(
      false,
      "Broker not fully configured",
      `The connection for ${church.displayName} isn't finished being set up on our side. Contact Disciple Studio and try again afterwards.`,
    );
  }

  try {
    const exchange = await exchangeCode(code);
    if (!exchange.ok) {
      console.error(
        `Pushpay code exchange failed for ${church.slug}: ${exchange.status} ${await exchange
          .text()
          .catch(() => "")}`,
      );
      return resultPage(
        false,
        "Connection failed",
        `Pushpay rejected the authorization (status ${exchange.status}). Open the consent link and approve again; if it keeps failing, contact Disciple Studio.`,
      );
    }
    const tokens = (await exchange.json()) as PushpayTokenResponse;

    const delivery = await fetch(church.storeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-broker-key": deliveryKey,
      },
      body: JSON.stringify({
        church: church.slug,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        scope: tokens.scope ?? "",
      }),
    });
    if (!delivery.ok) {
      console.error(
        `Pushpay token delivery to ${church.slug} failed: ${delivery.status} ${await delivery
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
      `${church.displayName}'s Pushpay giving account is now linked to Disciple Studio. You can close this tab.`,
    );
  } catch (err) {
    console.error(`Pushpay callback error for ${church.slug}:`, err);
    return resultPage(
      false,
      "Something went wrong",
      "An unexpected error interrupted the connection. Open the consent link and try again.",
    );
  }
}
