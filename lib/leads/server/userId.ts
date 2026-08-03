/**
 * Which workspace a route is reading and writing. There is exactly one.
 *
 * Both functions return the same constant and neither can fail. They keep their
 * async, nullable shapes so the five `/api/leads/groups/**` handlers are
 * unchanged, and so that introducing real accounts later is an edit to this file
 * rather than to every route.
 *
 * See `lib/leads/identity.ts` for why the per-device cookie this used to read is
 * gone, and what that costs.
 */

import { WORKSPACE_ID } from "@/lib/leads/identity";

/** Never null in this build. Kept nullable-shaped because callers branch on it,
 *  and a real account system will need that branch back. */
export async function getUserId(): Promise<string | null> {
  return WORKSPACE_ID;
}

/**
 * The workspace id.
 *
 * This used to be able to 401 — "No identity cookie. Reload to obtain one." —
 * when a cookie was stripped or the signing secret rotated mid-session. With
 * nothing to verify there is nothing to fail, so that failure mode is gone rather
 * than handled. Whether a request may touch this state at all is decided upstream
 * by `proxy.ts`, which is the only thing that ever really decided it.
 */
export async function requireUserId(): Promise<string> {
  return WORKSPACE_ID;
}
