/**
 * Opaque per-device identity for the Lead Console.
 *
 * The studio's only auth is one shared HTTP Basic password (see `proxy.ts`), so
 * there is no per-person identity to hang shared state off. The Lead Console's
 * state model needs one: every mutable blob has exactly ONE logical writer,
 * chosen by putting the writer's identity in the key, and that is what removes
 * the need for transactions on a store with no compare-and-swap.
 *
 * So on successful Basic auth the proxy mints a signed, opaque id and sets it as
 * an HttpOnly cookie. Signed rather than raw because the SERVER reads it to
 * decide which blob to write — an unsigned client-supplied id would let one
 * browser write another's state, which turns "one writer per blob" from an
 * invariant into a convention.
 *
 * BE HONEST ABOUT WHAT THIS IS: it identifies a DEVICE, not a person. One person
 * on two machines is two users. That is harmless for marks (they fold with
 * `max()` across users) and only cosmetically wrong in export attribution.
 * Because the id is opaque, swapping in real accounts later is a login page plus
 * a different `getUserId()` — the blob layout does not change.
 *
 * Sign and verify live in ONE module on purpose. The last time this codebase
 * kept two copies of a table that had to agree, they drifted (see
 * `02-COLOR-AND-HONESTY.md` invariant 8); two copies of an HMAC would drift the
 * same way, and the symptom — every cookie silently rejected, a fresh id minted
 * on every request, one user's marks scattered across dozens of blobs — would
 * look like anything but a signing bug.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const USER_COOKIE = "ds_uid";

/** 400 days: the longest a browser will honour, so a returning rep keeps their marks. */
export const USER_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

/**
 * Falls back to STUDIO_PASSWORD so this works with no new env var. Set
 * LEADS_ID_SECRET to decouple the two.
 *
 * ROTATING EITHER INVALIDATES EVERY ID. Existing per-user state is orphaned, not
 * lost — it stays in its old blob and stops being read. Rotate deliberately.
 */
export function identitySecret(): string | null {
  return process.env.LEADS_ID_SECRET ?? process.env.STUDIO_PASSWORD ?? null;
}

/** `u_` + 16 hex. Opaque, never an email — emails change, keys shouldn't. */
export function mintUserId(): string {
  return `u_${randomBytes(8).toString("hex")}`;
}

function sign(id: string, secret: string): string {
  return createHmac("sha256", secret).update(id).digest("base64url");
}

/** The cookie value: `<id>.<sig>`. */
export function signUserId(id: string, secret: string): string {
  return `${id}.${sign(id, secret)}`;
}

/**
 * Returns the id, or null if the token is malformed or the signature does not
 * verify. Never throws — a hostile cookie is a routine input here, not an error.
 */
export function verifyUserToken(
  token: string | undefined | null,
  secret: string,
): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  // Reject before hashing: the id is echoed into blob KEYS, so anything that is
  // not our own alphabet must never reach the storage layer, signature or not.
  if (!/^u_[0-9a-f]{16}$/.test(id)) return null;

  const expected = Buffer.from(sign(id, secret));
  const actual = Buffer.from(sig);
  // timingSafeEqual throws on a length mismatch, so check that first.
  if (expected.length !== actual.length) return null;
  return timingSafeEqual(expected, actual) ? id : null;
}
