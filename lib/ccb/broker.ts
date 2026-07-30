import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * CCB ChMS v2 OAuth broker — Disciple Studio side.
 *
 * Disciple Studio owns ONE vendor OAuth app ("Disciple Studio") that covers
 * every client church; per-church access comes from CCB's three-legged System
 * Auth consent flow. This module is the broker core: the church registry, the
 * signed `state` parameter that ties a consent click back to a church, and the
 * two CCB token calls (code exchange + refresh).
 *
 * The broker is stateless by design: tokens are delivered straight to each
 * church's own backend (storeUrl) and never persisted here. Only the vendor
 * client_id/client_secret live in this deployment's env — a church backend
 * can't mint tokens without us, and we hold no tokens to leak. Refreshes need
 * refresh_token (church) + client_secret (us), so both sides must cooperate.
 */

export const CCB_AUTHORIZE_URL = "https://oauth.ccbchurch.com/oauth/authorize";
export const CCB_TOKEN_URL = "https://api.ccbchurch.com/oauth/token";
/** Must EXACTLY match the redirect URI registered with Pushpay, protocol included. */
export const CCB_REDIRECT_URI = "https://www.disciple.studio/oauth/ccb/callback";
const CCB_V2_ACCEPT = "application/vnd.ccbchurch.v2+json";

/** Consent links expire after this long (state TTL). */
export const STATE_TTL_DAYS = 7;
const STATE_TTL_SECONDS = STATE_TTL_DAYS * 24 * 60 * 60;

export type CcbChurch = {
  /** Registry key; also the `church` value in signed state and refresh calls. */
  slug: string;
  /** CCB subdomain ([subdomain].ccbchurch.com) — required in every token call. */
  subdomain: string;
  displayName: string;
  /** Church-backend endpoint that receives tokens after a consent exchange. */
  storeUrl: string;
  /** Env var holding the shared broker key for this church's backend. */
  keyEnv: string;
};

export const CCB_CHURCHES: Record<string, CcbChurch> = {
  aletheia: {
    slug: "aletheia",
    subdomain: "aletheia",
    displayName: "Aletheia",
    storeUrl:
      "https://us-central1-aletheia-3a8a0.cloudfunctions.net/ccbOauthStore",
    keyEnv: "CCB_CHURCH_KEY_ALETHEIA",
  },
};

export type CcbTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope?: string;
};

function vendorCreds() {
  const clientId = process.env.CCB_V2_CLIENT_ID;
  const clientSecret = process.env.CCB_V2_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("CCB_V2_CLIENT_ID / CCB_V2_CLIENT_SECRET are not set");
  }
  return { clientId, clientSecret };
}

function stateSecret(): string {
  const secret = process.env.CCB_OAUTH_STATE_SECRET;
  if (!secret) throw new Error("CCB_OAUTH_STATE_SECRET is not set");
  return secret;
}

/** The shared broker key for a church, or null if unconfigured (callers fail closed). */
export function churchKey(church: CcbChurch): string | null {
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
export function signState(church: CcbChurch): string {
  const payload = Buffer.from(
    JSON.stringify({
      c: church.slug,
      n: randomBytes(8).toString("hex"),
      iat: Math.floor(Date.now() / 1000),
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyState(state: string): CcbChurch | null {
  const dot = state.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = state.slice(0, dot);
  if (!safeEqual(state.slice(dot + 1), sign(payload))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Math.floor(Date.now() / 1000) - Number(parsed.iat) > STATE_TTL_SECONDS) {
      return null;
    }
    return CCB_CHURCHES[String(parsed.c)] ?? null;
  } catch {
    return null;
  }
}

/** The full authorize URL a church Master Admin opens to grant access. */
export function consentUrl(church: CcbChurch): string {
  const { clientId } = vendorCreds();
  const qs = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: CCB_REDIRECT_URI,
    subdomain: church.subdomain,
    state: signState(church),
  });
  return `${CCB_AUTHORIZE_URL}?${qs}`;
}

function tokenCall(body: Record<string, string>): Promise<Response> {
  return fetch(CCB_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: CCB_V2_ACCEPT },
    body: JSON.stringify(body),
  });
}

export function exchangeCode(church: CcbChurch, code: string): Promise<Response> {
  const { clientId, clientSecret } = vendorCreds();
  return tokenCall({
    grant_type: "authorization_code",
    subdomain: church.subdomain,
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: CCB_REDIRECT_URI,
  });
}

export function refreshTokens(
  church: CcbChurch,
  refreshToken: string,
): Promise<Response> {
  const { clientId, clientSecret } = vendorCreds();
  return tokenCall({
    grant_type: "refresh_token",
    subdomain: church.subdomain,
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
}