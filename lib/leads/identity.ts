/**
 * WHO IS WRITING: one workspace, shared by everyone who knows the password.
 *
 * The studio's only auth is a single HTTP Basic login (see `proxy.ts`). Two
 * people use it the way two people use one Google account on one Google Doc —
 * one at a time, no per-person accounts, no per-person state — so the console has
 * exactly ONE workspace and every batch belongs to it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS REPLACED, AND WHY IT WAS WRONG FOR THIS PRODUCT
 *
 * This module used to mint `u_` + eight random bytes per BROWSER on successful
 * auth, sign it, and set it as an HttpOnly cookie — a per-device identity, so
 * that "every mutable object has exactly one logical writer" could be enforced by
 * putting the writer in the storage key. That is a sound design for a store with
 * no compare-and-swap, and it is the wrong shape for this product:
 *
 *  · TWO PEOPLE SHARING ONE PASSWORD GOT TWO DISJOINT WORKSPACES. They could not
 *    see each other's batches — the one thing a shared login is supposed to buy.
 *  · SO DID ONE PERSON ON TWO MACHINES. Laptop and desktop were two users.
 *  · CLEARING COOKIES SILENTLY ORPHANED EVERYTHING. The batches were not deleted;
 *    they stayed under an id nothing would ever mint again and simply stopped
 *    appearing. An empty picker is a much worse symptom than an error.
 *  · ROTATING THE PASSWORD DID THE SAME THING TO EVERYONE AT ONCE, because the
 *    signing secret fell back to `STUDIO_PASSWORD`.
 *
 * A constant id has none of those failure modes and needs no cookie, no HMAC and
 * no secret: the id is not a credential, and it never was. Basic auth is what
 * decides whether a request may touch state; this only decides which key that
 * state lives under. There is nothing for a client to forge, because there is
 * nothing a client can say that would change the answer.
 *
 * WHAT IT COSTS, PLAINLY: the single-writer guarantee is gone. Two browsers can
 * now write the same batch. Different batches are still perfectly safe — separate
 * keys — but simultaneous edits to the SAME batch are last-write-wins, and the
 * loser's changes to it are lost. That is the accepted trade for a shared
 * workspace, and it is why `openGroup` keeps its find-or-create comment about
 * racing clicks. If overlap ever turns out to happen in practice, R2 supports
 * conditional writes (`If-Match` on an ETag), which the previous store did not —
 * a stale write could be rejected and retried rather than silently winning.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * KEEPING THE ID IN THE KEY, rather than dropping the segment. Real accounts
 * later are then a login page and a different `getUserId()`, with the stored
 * layout unchanged — which is the same promise the per-device version made, and
 * the only part of it worth keeping.
 *
 * The literal must satisfy `SAFE_USER_ID` in `lib/leads/server/groups.ts`
 * (`/^u_[0-9a-f]{16}$/`), because it still becomes a storage path segment and
 * that check still runs.
 */

/** The one workspace. Not a secret, not a credential — a storage path segment. */
export const WORKSPACE_ID = "u_0000000000000000";
