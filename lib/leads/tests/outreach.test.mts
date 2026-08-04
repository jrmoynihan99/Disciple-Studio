/**
 * THE RECIPIENT RULE, which decides two things a congregation reads: the address
 * a cold email arrives at, and the word it opens with.
 *
 * Getting the second wrong is the expensive one. The pitch is a message that
 * reads as though somebody wrote it by hand, and "Hi Joel" landing in Jennifer's
 * inbox undoes that in the first three words — so the shared-inbox case below is
 * the reason this file exists, not an edge case bolted onto it.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { pickRecipient } from "../engine/outreach.ts";

const person = (name: string, email: string, rank: number, title = "") => ({ name, email, rank, title });

test("the lowest rank wins, and it is greeted by given name", () => {
  const r = pickRecipient({
    people: [person("Aaron Paulsey", "aaron@x.org", 1, "Director of Technology"), person("Bo Cheatham", "bo@x.org", 0, "Senior Pastor")],
  });
  assert.equal(r?.email, "bo@x.org");
  assert.equal(r?.firstName, "Bo");
  assert.equal(r?.source, "person");
});

test("honorifics are not a first name", () => {
  const r = pickRecipient({ people: [person("Rev. Dr. Karen Webb", "karen@x.org", 0)] });
  assert.equal(r?.firstName, "Karen");
  assert.equal(r?.lastName, "Webb");
});

test("a SHOUTED name is not shouted back", () => {
  const r = pickRecipient({ people: [person("MARK STEVENS", "mark@x.org", 0)] });
  assert.equal(r?.firstName, "Mark");
});

/**
 * The Living Word Church case, verbatim from the corpus: three different people
 * listing one address. The address is real and still gets used — dropping a
 * reachable church would be the worse failure — but it cannot be greeted.
 */
test("one inbox listed by several people forfeits the first name", () => {
  const r = pickRecipient({
    people: [
      person("Joel Murray", "jennifer@dlwc.org", 0, "Lead Pastor"),
      person("Pat Murray", "jennifer@dlwc.org", 1, "Founding Pastors"),
      person("Jackie Murray", "jennifer@dlwc.org", 2, "Founding Pastors"),
    ],
  });
  assert.equal(r?.email, "jennifer@dlwc.org");
  assert.equal(r?.firstName, "", "a shared inbox must not be greeted by one person's name");
  assert.match(r!.why, /shared inbox/);
});

test("the same person listed twice is not ambiguous", () => {
  const r = pickRecipient({
    people: [person("Joel Murray", "joel@x.org", 0), person("joel murray", "joel@x.org", 1)],
  });
  assert.equal(r?.firstName, "Joel");
});

test("a church office address is used when nobody is named", () => {
  const r = pickRecipient({ people: [], church_emails: ["info@x.org", "office@x.org"] });
  assert.equal(r?.email, "info@x.org");
  assert.equal(r?.firstName, "");
  assert.equal(r?.source, "church_email");
});

test("a named contact outranks the office address", () => {
  const r = pickRecipient({
    people: [person("Bo Cheatham", "bo@x.org", 0)],
    church_emails: ["info@x.org"],
  });
  assert.equal(r?.email, "bo@x.org");
});

test("noreply and role inboxes are refused, not merely deprioritised", () => {
  for (const bad of ["noreply@x.org", "no-reply@x.org", "donotreply@x.org", "postmaster@x.org", "webmaster@x.org", "bounces@x.org"]) {
    assert.equal(pickRecipient({ church_emails: [bad] }), null, `${bad} must not be emailed`);
  }
});

test("a refused address does not shadow a usable one behind it", () => {
  const r = pickRecipient({ church_emails: ["noreply@x.org", "office@x.org"] });
  assert.equal(r?.email, "office@x.org");
});

test("a person with a noreply address falls through to the office", () => {
  const r = pickRecipient({
    people: [person("Someone", "noreply@x.org", 0)],
    church_emails: ["info@x.org"],
  });
  assert.equal(r?.email, "info@x.org");
});

test("an unrankable contact does not outrank a ranked one", () => {
  const r = pickRecipient({
    people: [{ name: "Unranked", email: "un@x.org" }, person("Ranked", "ranked@x.org", 3)],
  });
  assert.equal(r?.email, "ranked@x.org");
});

test("addresses are normalised, so casing cannot split one inbox into two", () => {
  const r = pickRecipient({
    people: [person("Joel Murray", "Jennifer@DLWC.org", 0), person("Pat Murray", "jennifer@dlwc.org", 1)],
  });
  assert.equal(r?.email, "jennifer@dlwc.org");
  assert.equal(r?.firstName, "", "case must not hide that these are the same inbox");
});

test("a church with no email at all is null, not an empty address", () => {
  assert.equal(pickRecipient({ people: [], church_emails: [] }), null);
  assert.equal(pickRecipient(null), null);
  assert.equal(pickRecipient(undefined), null);
  assert.equal(pickRecipient({}), null);
});

test("a contact recorded as nothing but a title is used, unnamed", () => {
  const r = pickRecipient({ people: [person("Pastor", "pastor@x.org", 0)] });
  assert.equal(r?.email, "pastor@x.org");
  assert.equal(r?.firstName, "", "'Pastor' is a title, not a name to greet by");
});
