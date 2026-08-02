/**
 * WHAT IS LEFT TO TEST once identity is a constant.
 *
 * This file used to cover mint/sign/verify: a signed id round-tripping, a
 * tampered id rejected, a wrong secret rejected, and — the one that mattered — a
 * correctly signed `../../team/config` refused before it could reach a storage
 * key. All four guarded a client-supplied value. There is no longer a
 * client-supplied value: the workspace id is a literal in the source, so it
 * cannot be forged, replayed or traversed, and testing that a constant equals
 * itself proves nothing.
 *
 * ONE REAL INVARIANT SURVIVES, and it is a coupling between two files that a
 * compiler cannot see. `keyFor`/`indexKey` in `lib/leads/server/groups.ts` build
 * a storage path out of this id and gate it on `SAFE_USER_ID`
 * (`/^u_[0-9a-f]{16}$/`). If someone ever "improves" the constant to something
 * readable — `workspace`, `shared`, or worse something with a slash — every
 * batch read and write throws at runtime, and a value containing `..` would be
 * trying to climb out of the prefix. So the shape is asserted here, next to the
 * constant, where the edit would happen.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { WORKSPACE_ID } from "../identity.ts";

/** Kept in step with `SAFE_USER_ID` in `lib/leads/server/groups.ts`, which is
 *  `server-only` and so cannot be imported into a plain node test. */
const SAFE_USER_ID = /^u_[0-9a-f]{16}$/;

test("the workspace id is a legal storage path segment", () => {
  assert.match(
    WORKSPACE_ID,
    SAFE_USER_ID,
    "groups.ts refuses any user id outside this alphabet — every batch would fail to save",
  );
});

test("it cannot climb out of its prefix", () => {
  assert.ok(!WORKSPACE_ID.includes(".."), "a key segment must never spell a parent directory");
  assert.ok(!WORKSPACE_ID.includes("/"), "a key segment must not introduce its own path separator");
});
