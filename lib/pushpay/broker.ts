import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Pushpay Giving v1 OAuth broker — Disciple Studio side.
 *
 * Sibling of lib/ccb/broker.ts: one Disciple Studio vendor OAuth app covers
 * every client church, and per-church access comes from Pushpay's Code Flow
 * consent screen. Unlike CCB this is Pushpay's own auth server
 * (auth.pushpay.com), so credentials, endpoints, and the token exchange format
 * are all separate from the ChMS broker: Basic-auth'd form-encoded token
 * calls, no subdomain, and sandbox/production are distinct environments
 * (PUSHPAY_ENV) with separately issued credentials.
 *
 * Same stateless design: tokens are delivered straight to each church's own
 * backend (storeUrl) and never persisted here.
 *
 * CAUTION on `state`: Pushpay's Giving docs don't document the parameter
 * (CCB's do). We send it anyway and require it back — if Pushpay drops it,
 * the callback fails with a distinct "state missing" page so sandbox testing
 * surfaces this immediately, and church identity would then have to come from
 * the in-scope-organizations endpoint instead.
 */

const ENVS = {
  sandbox: {
    authorizeUrl: "https://auth.pushpay.com/pushpay-sandbox/oauth/authorize",
    tokenUrl: "https://auth.pushpay.com/pushpay-sandbox/oauth/token",
    apiBaseUrl: "https://sandbox-api.pushpay.io/v1",
  },
  production: {
    authorizeUrl: "https://auth.pushpay.com/pushpay/oauth/authorize",
    tokenUrl: "https://auth.pushpay.com/pushpay/oauth/token",
    apiBaseUrl: "https://api.pushpay.com/v1",
  },
} as const;

/** Sandbox until PUSHPAY_ENV=production — Pushpay issues sandbox creds first. */
export function pushpayEnv() {
  return process.env.PUSHPAY_ENV === "production"
    ? ENVS.production
    : ENVS.sandbox;
}

/** Must EXACTLY match the redirect URL whitelisted with Pushpay (api@pushpay.com). */
export const PUSHPAY_REDIRECT_URI =
  "https://www.disciple.studio/oauth/pushpay/callback";

/** Space-separated; override with PUSHPAY_SCOPES to match what Pushpay granted. */
function scopes(): string {
  return process.env.PUSHPAY_SCOPES ?? "merchant:view_payments";
}

/** Consent links expire after this long (state TTL). */
export const STATE_TTL_DAYS = 7;
const STATE_TTL_SECONDS = STATE_TTL_DAYS * 24 * 60 * 60;

export type PushpayChurch = {
  /** Registry key; also the `church` value in signed state and refresh calls. */
  slug: string;
  displayName: string;
  /** Church-backend endpoint that receives tokens after a consent exchange. */
  storeUrl: string;
  /** Env var holding the shared broker key for this church's backend. */
  keyEnv: string;
};

export const PUSHPAY_CHURCHES: Record<string, PushpayChurch> = {
  aletheia: {
    slug: "aletheia",
    displayName: "Aletheia",
    storeUrl:
      "https://us-central1-aletheia-3a8a0.cloudfunctions.net/pushpayOauthStore",
    keyEnv: "PUSHPAY_CHURCH_KEY_ALETHEIA",
  },
};

export type PushpayTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope?: string;
};

function vendorCreds() {
  const clientId = process.env.PUSHPAY_CLIENT_ID;
  const clientSecret = process.env.PUSHPAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PUSHPAY_CLIENT_ID / PUSHPAY_CLIENT_SECRET are not set");
  }
  return { clientId, clientSecret };
}

function stateSecret(): string {
  const secret = process.env.PUSHPAY_OAUTH_STATE_SECRET;
  if (!secret) throw new Error("PUSHPAY_OAUTH_STATE_SECRET is not set");
  return secret;
}

/** The shared broker key for a church, or null if unconfigured (callers fail closed). */
export function churchKey(church: PushpayChurch): string | null {
  return process.env[church.keyEnv] ?? null;
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function sign(payload: string): string {
  return createHmac("sha256", stateSecret()).update(payload).digest("base64url");
}

/**
 * state = base64url({c, n, iat}) + "." + HMAC — self-contained, so the
 * callback can verify a consent click (CSRF + church identity) without the
 * broker storing anything between the link being generated and being used.
 */
export function signState(church: PushpayChurch): string {
  const payload = Buffer.from(
    JSON.stringify({
      c: church.slug,
      n: randomBytes(8).toString("hex"),
      iat: Math.floor(Date.now() / 1000),
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyState(state: string): PushpayChurch | null {
  const dot = state.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = state.slice(0, dot);
  if (!safeEqual(state.slice(dot + 1), sign(payload))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Math.floor(Date.now() / 1000) - Number(parsed.iat) > STATE_TTL_SECONDS) {
      return null;
    }
    return PUSHPAY_CHURCHES[String(parsed.c)] ?? null;
  } catch {
    return null;
  }
}

/** The full authorize URL a church admin opens to grant access. */
export function consentUrl(church: PushpayChurch): string {
  const { clientId } = vendorCreds();
  const qs = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: PUSHPAY_REDIRECT_URI,
    scope: scopes(),
    state: signState(church),
  });
  return `${pushpayEnv().authorizeUrl}?${qs}`;
}

/** Pushpay token calls: Basic auth with vendor creds, form-encoded body. */
function tokenCall(body: Record<string, string>): Promise<Response> {
  const { clientId, clientSecret } = vendorCreds();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return fetch(pushpayEnv().tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
}

export function exchangeCode(code: string): Promise<Response> {
  return tokenCall({
    grant_type: "authorization_code",
    code,
    redirect_uri: PUSHPAY_REDIRECT_URI,
  });
}

export function refreshTokens(refreshToken: string): Promise<Response> {
  return tokenCall({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}
