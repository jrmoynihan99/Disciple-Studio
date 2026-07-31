/**
 * Server-side read of the per-device id minted by `proxy.ts`.
 *
 * Route handlers call this to decide WHICH per-user blob they are allowed to
 * write. It reads the signed cookie and nothing else — never a body field, never
 * a header the client controls. That is the whole point: "every mutable blob has
 * exactly one logical writer" is only an invariant if the writer's identity
 * cannot be chosen by the caller.
 */

import { cookies } from "next/headers";
import { USER_COOKIE, identitySecret, verifyUserToken } from "@/lib/leads/identity";

/** The verified id, or null. Callers that need one should 401 on null. */
export async function getUserId(): Promise<string | null> {
  const secret = identitySecret();
  if (!secret) return null;

  const store = await cookies();
  return verifyUserToken(store.get(USER_COOKIE)?.value, secret);
}

/**
 * `getUserId()` or a thrown 401 Response, for routes that cannot proceed without
 * an identity. Reaching this on a gated path means the proxy ran and the cookie
 * was stripped or the secret rotated mid-session — rare, but a silent fallback
 * to a shared id would quietly merge two people's marks.
 */
export async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) {
    throw new Response("No identity cookie. Reload to obtain one.", {
      status: 401,
    });
  }
  return id;
}
