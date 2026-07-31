import { test } from "node:test";
import assert from "node:assert/strict";
import { mintUserId, signUserId, verifyUserToken } from "../identity.ts";

const SECRET = "test-secret";

test("a signed id round-trips", () => {
  const id = mintUserId();
  assert.match(id, /^u_[0-9a-f]{16}$/);
  assert.equal(verifyUserToken(signUserId(id, SECRET), SECRET), id);
});

test("a tampered id is rejected", () => {
  const id = mintUserId();
  const token = signUserId(id, SECRET);
  const forged = token.replace(/^u_[0-9a-f]{16}/, "u_0000000000000000");
  assert.equal(verifyUserToken(forged, SECRET), null);
});

test("a different secret is rejected", () => {
  assert.equal(verifyUserToken(signUserId(mintUserId(), SECRET), "other"), null);
});

test("garbage never throws", () => {
  for (const bad of ["", "nope", "a.b", ".", "u_zz.sig", undefined, null]) {
    assert.equal(verifyUserToken(bad as string | undefined, SECRET), null);
  }
});

test("an id outside our alphabet cannot reach the storage layer", () => {
  // even correctly signed: the id is echoed into blob keys
  const evil = "../../team/config";
  assert.equal(verifyUserToken(signUserId(evil, SECRET), SECRET), null);
});
