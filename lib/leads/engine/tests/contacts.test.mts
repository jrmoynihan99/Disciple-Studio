/**
 * WHICH CONTACTS SHIP.
 *
 * The export carries at most four, so the review sheet must show exactly those
 * four. The failure this guards against is silent in both directions: show more
 * and a reviewer approves a line that never ships; show fewer, or different
 * ones, and the line that DOES ship was never read by anybody.
 *
 * The channel rule is the other half. A church with an office address, a phone
 * number and four social profiles has one obvious way to be contacted and five
 * distractions, and the distractions are what push the address off the card.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { CONTACT_LIMIT, contactTier, exportContacts } from "../contacts.ts";
import type { ResolvedContact } from "../group-types.ts";
import { HAVE_FIXTURE, loadIndex, loadRecord } from "./fixture.mts";
import { buildEntry } from "../snapshot.ts";
import { resolve } from "../group.ts";

const c = (over: Partial<ResolvedContact>): ResolvedContact => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  provenance: "source",
  suppressed: false,
  kind: "person",
  name: "",
  title: "",
  roleLabel: "",
  email: "",
  value: "",
  network: "",
  edited: false,
  ...over,
});

const person = (name: string, email = "") => c({ kind: "person", name, email });
const churchEmail = (email: string) => c({ kind: "churchEmail", email });
const phone = (value: string) => c({ kind: "phone", value });
const social = (network: string) => c({ kind: "social", network, value: `https://${network}.com/x` });

const kinds = (out: ReturnType<typeof exportContacts>) => out.map((r) => r.contact.kind);
const ranks = (out: ReturnType<typeof exportContacts>) => out.map((r) => r.rank);

describe("exportContacts", () => {
  test("an email anywhere silences the phone and the socials", () => {
    const out = exportContacts([
      person("Sarah", "sarah@church.org"),
      phone("555-0100"),
      social("facebook"),
      social("instagram"),
    ]);
    assert.deepEqual(kinds(out), ["person"]);
  });

  test("a church address counts as an email, not just a person's", () => {
    const out = exportContacts([churchEmail("office@church.org"), phone("555-0100")]);
    assert.deepEqual(kinds(out), ["churchEmail"]);
  });

  test("no email but a phone silences the socials", () => {
    const out = exportContacts([phone("555-0100"), social("facebook"), social("youtube")]);
    assert.deepEqual(kinds(out), ["phone"]);
  });

  test("no email and no phone shows every social", () => {
    const out = exportContacts([social("facebook"), social("instagram"), social("youtube")]);
    assert.deepEqual(kinds(out), ["social", "social", "social"]);
  });

  /**
   * A PERSON WE COULD NOT REACH IS STILL THE BEST THING ON THE CARD.
   *
   * "Sarah Vance, Connections Pastor" turns a cold call warm even when the
   * pipeline never found her address — you ring the office and ask for her. So a
   * person rides in the email tier rather than being dropped as unreachable, and
   * their presence does NOT suppress the phone, because without an address
   * somewhere the phone is how you reach them.
   */
  test("a named person with no address does not suppress the phone", () => {
    const out = exportContacts([person("Sarah"), phone("555-0100"), social("facebook")]);
    assert.deepEqual(kinds(out), ["person", "phone"]);
    assert.ok(!kinds(out).includes("social"));
  });

  /**
   * This test asserted that a struck-out contact was REMOVED from the returned
   * list. That was wrong and shipped: it made striking one out identical to a
   * hard delete, with nothing left to press "put back" on. It now asserts what
   * the rule actually has to do — take no rank, promote the next candidate, and
   * stay on the card. See "a struck-out contact stays on the card" below.
   */
  test("striking one out promotes the next, and does not use up a slot", () => {
    const out = exportContacts([
      c({ kind: "person", name: "Struck", email: "a@x.org", suppressed: true }),
      person("B", "b@x.org"),
      person("C", "c@x.org"),
      person("D", "d@x.org"),
      person("E", "e@x.org"),
    ]);
    const shipping = out.filter((r) => r.rank !== null);
    assert.equal(shipping.length, CONTACT_LIMIT);
    assert.deepEqual(
      shipping.map((r) => r.contact.name),
      ["B", "C", "D", "E"],
      "striking one out must promote the next, not shorten the list",
    );
  });

  test("never more than the export carries", () => {
    const out = exportContacts(
      Array.from({ length: 9 }, (_, i) => person(`P${i}`, `p${i}@x.org`)),
    );
    assert.equal(out.length, CONTACT_LIMIT);
  });

  /**
   * The renumbering is the whole point of returning a rank rather than letting
   * the component use its array index — the two only coincide today, and a
   * reviewer asking "who is contact 1" must never have to reason about the ones
   * that were filtered out above them.
   */
  test("ranks are 1..N over the survivors, not the originals", () => {
    const out = exportContacts([
      c({ kind: "person", name: "gone", email: "g@x.org", suppressed: true }),
      person("first", "1@x.org"),
      c({ kind: "person", name: "gone2", email: "g2@x.org", suppressed: true }),
      person("second", "2@x.org"),
    ]);
    // The struck ones are still returned, rankless, between the survivors.
    assert.deepEqual(ranks(out), [null, 1, null, 2]);
    assert.deepEqual(
      out.filter((r) => r.rank !== null).map((r) => r.contact.name),
      ["first", "second"],
    );
  });

  test("input order is preserved — it encodes the pipeline's priority", () => {
    const out = exportContacts([
      person("recommended", "r@x.org"),
      person("comms", "c@x.org"),
      churchEmail("office@x.org"),
    ]);
    assert.deepEqual(
      out.map((r) => r.contact.name || r.contact.email),
      ["recommended", "comms", "office@x.org"],
    );
  });

  test("nothing in, nothing out", () => {
    assert.deepEqual(exportContacts([]), []);
    // A lone struck-out phone still renders — there is a decision to undo.
    assert.deepEqual(ranks(exportContacts([c({ kind: "phone", value: "x", suppressed: true })])), [
      null,
    ]);
  });

  test("a person is never treated as a channel", () => {
    assert.equal(contactTier({ kind: "person", email: "" }), "email");
    assert.equal(contactTier({ kind: "churchEmail", email: "a@b.c" }), "email");
    assert.equal(contactTier({ kind: "phone", email: "" }), "phone");
    assert.equal(contactTier({ kind: "social", email: "" }), "social");
  });

  /**
   * Against the real corpus, because every assertion above is on data I wrote.
   * What matters at scale is that no church produces a card mixing channels or
   * running past four — and that the rule does not silently empty a card that
   * had contacts before it ran.
   */
  test(
    "over the corpus: never mixed, never over the limit, never emptied",
    { skip: !HAVE_FIXTURE && "fixture not present" },
    () => {
      let hadContacts = 0;
      let emptied = 0;
      const tiersSeen = new Set<string>();

      for (const row of loadIndex().slice(0, 3000)) {
        // Through the real path — `buildEntry` freezes the snapshot the way
        // collecting a church does, and `resolve` is what the card renders from.
        const raw = resolve(buildEntry(row, loadRecord(row.id), "fixture-1", 0)).contacts;
        const out = exportContacts(raw);

        const ships = out.filter((r) => r.rank !== null);
        assert.ok(ships.length <= CONTACT_LIMIT, `${row.id} ships ${ships.length}`);
        assert.deepEqual(
          ships.map((r) => r.rank),
          ships.map((_, i) => i + 1),
          `${row.id} ranks are not 1..N`,
        );

        // Persons are excluded from the mix check on purpose: they are not a
        // channel, so "a named pastor plus the office phone" is one way to make
        // contact, not two.
        const tiers = new Set(
          out.filter((r) => r.contact.kind !== "person").map((r) => contactTier(r.contact)),
        );
        assert.ok(tiers.size <= 1, `${row.id} mixes channels: ${[...tiers].join(", ")}`);
        for (const t of tiers) tiersSeen.add(t);

        if (raw.length) {
          hadContacts++;
          if (!out.length) emptied++;
        }
      }

      assert.ok(hadContacts > 0, "no church in the sample has any contact at all");
      assert.equal(emptied, 0, `${emptied} churches had contacts and now show none`);
      // All three branches have to occur, or two of them are untested claims.
      assert.deepEqual([...tiersSeen].sort(), ["email", "phone", "social"]);
    },
  );
});

/**
 * SUPPRESSION IS NOT DELETION — the regression that shipped and was caught by
 * `/leads/audit` rather than by anything here.
 *
 * Filtering struck-out contacts out of the returned list removed them from the
 * DOM, which is indistinguishable from a hard delete and leaves nothing to press
 * "put back" on. The two questions are separate: does it SHIP (no) and does it
 * RENDER (yes, struck through).
 */
describe("a struck-out contact stays on the card", () => {
  test("it is returned, with no rank", () => {
    const out = exportContacts([
      person("kept", "a@x.org"),
      c({ kind: "person", name: "struck", email: "b@x.org", suppressed: true }),
      person("also kept", "c@x.org"),
    ]);
    assert.deepEqual(
      out.map((r) => [r.contact.name, r.rank]),
      [
        ["kept", 1],
        ["struck", null],
        ["also kept", 2],
      ],
      "a struck contact must stay visible, and must not consume a rank",
    );
  });

  test("it does not use up one of the four", () => {
    const out = exportContacts([
      c({ kind: "person", name: "struck", email: "s@x.org", suppressed: true }),
      ...["a", "b", "c", "d"].map((n) => person(n, `${n}@x.org`)),
      person("e", "e@x.org"),
    ]);
    assert.equal(out.filter((r) => r.rank !== null).length, CONTACT_LIMIT);
    assert.deepEqual(
      out.filter((r) => r.rank !== null).map((r) => r.contact.name),
      ["a", "b", "c", "d"],
    );
    assert.ok(out.some((r) => r.rank === null), "the struck one is still on the card");
  });

  /**
   * A contact the CHANNEL rule dropped never renders: nobody chose it, so there
   * is nothing to undo. Only a human's decision earns a place on the card.
   */
  test("a channel the rule dropped is gone — unless a human struck it", () => {
    const out = exportContacts([
      person("has email", "e@x.org"),
      c({ kind: "social", network: "facebook", value: "https://f" }),
      phone("555-0100"),
    ]);
    assert.deepEqual(kinds(out), ["person"], "nobody chose these, so there is nothing to undo");
  });

  /**
   * THE CASE THAT CAUGHT THE BUG, from a real church in the corpus: its only
   * email is struck out, so the tier falls to `phone` — and gating suppressed
   * contacts on the tier then deleted the struck email along with its own undo
   * control. The reviewer could not reverse what they had just done.
   */
  test("striking the only email keeps it on the card, even as the tier falls away", () => {
    const out = exportContacts([
      c({ kind: "churchEmail", email: "office@x.org", suppressed: true }),
      phone("555-0100"),
      social("facebook"),
    ]);
    assert.deepEqual(kinds(out), ["churchEmail", "phone"]);
    assert.deepEqual(ranks(out), [null, 1], "the struck email renders, rankless");
  });
});
