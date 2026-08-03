/**
 * "Welcome back, Rev."
 *
 * The demo greets the church's own rank-1 contact by their first name, and the
 * rule for "first name" was `name.trim().split(/\s+/)[0]`. On a fifth of this
 * corpus that token is the honorific, and `properCase` then normalised "REV."
 * into "Rev." — so the wrong word shipped looking like a deliberate choice, over
 * an avatar built from the same string's first letter.
 *
 * Measured over the full corpus: 2,722 churches have a named rank-1 recommended
 * contact and 549 of them start with a title or a bare initial. For scale, the
 * ALL-CAPS case this line was last edited to handle affects 97.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  demoGreeting,
  DEMO_MEMBER_FIRST_NAME,
  givenName,
  properCase,
} from "../person-name.ts";

describe("givenName", () => {
  test("an ordinary name is its first word", () => {
    assert.equal(givenName("Sarah Vance"), "Sarah");
    assert.equal(givenName("Mark"), "Mark");
    assert.equal(givenName("  Ben   Ellis  "), "Ben");
  });

  /** The four that account for 499 of the 549. */
  test("the common honorifics are dropped", () => {
    assert.equal(givenName("Rev. Tom Blanchard"), "Tom");
    assert.equal(givenName("Dr. Karen Webb"), "Karen");
    assert.equal(givenName("Pastor Mike Ruiz"), "Mike");
    assert.equal(givenName("Fr. Sean Daly"), "Sean");
  });

  /** The corpus takes names as the page spelled them, and church pages shout. */
  test("a shouted or dotless title is still a title", () => {
    assert.equal(givenName("REV. TOM BLANCHARD"), "TOM");
    assert.equal(givenName("Rev Tom Blanchard"), "Tom");
    assert.equal(givenName("PASTOR Mike"), "Mike");
  });

  /** "Rev. Dr. Karen Webb" is a real shape, so one pass is not enough. */
  test("stacked titles are all dropped", () => {
    assert.equal(givenName("Rev. Dr. Karen Webb"), "Karen");
    assert.equal(givenName("Rev Dr. J. Michael Carter"), "Michael");
  });

  /** A letter is not a name. "J. Michael Carter" must not greet somebody "J." */
  test("a bare initial is skipped", () => {
    assert.equal(givenName("J. Michael Carter"), "Michael");
    assert.equal(givenName("A B Charles"), "Charles");
  });

  test("punctuation around a title does not hide it", () => {
    assert.equal(givenName("(Rev.) Tom Blanchard"), "Tom");
    assert.equal(givenName("Rev, Tom Blanchard"), "Tom");
  });

  /** Interior punctuation belongs to the name and must survive. */
  test("hyphens and apostrophes are part of the name", () => {
    assert.equal(givenName("Jean-Luc Devereaux"), "Jean-Luc");
    assert.equal(givenName("Rev. O'Brien Kelly"), "O'Brien");
  });

  /**
   * `""` IS A REAL ANSWER, not a failure. The corpus holds contacts recorded as
   * nothing but a title, and the caller falls back to its default demo member —
   * greeting an empty string would be the worse outcome.
   */
  test("a name that is only a title yields nothing", () => {
    assert.equal(givenName("Pastor"), "");
    assert.equal(givenName("Rev."), "");
    assert.equal(givenName(""), "");
    assert.equal(givenName("   "), "");
  });

  test("it never throws on the shapes a scrape produces", () => {
    assert.equal(givenName("..."), "");
    assert.equal(givenName("123"), "");
    assert.equal(givenName("Иван Петров"), "Иван");
  });
});

/**
 * CASE IS THE CHURCH'S STYLING, NOT THEIR SPELLING — except where it is.
 *
 * Staff directories are set in uppercase often enough that 5,291 of 164,370
 * named contacts have an ALL-CAPS first name, and 739 are entirely lowercase.
 * Both ship "Welcome back, MARK." Undoing that is easy; the careful half is not
 * "fixing" the capitals a person actually chose.
 */
describe("properCase", () => {
  test("a shouted name is quieted", () => {
    assert.equal(properCase("MARK"), "Mark");
    assert.equal(properCase("BLANCHARD"), "Blanchard");
  });

  test("a lowercase name is raised, and only its first letter", () => {
    assert.equal(properCase("alex"), "Alex");
  });

  /** The one that a naive title-caser gets wrong, on real people's names. */
  test("interior capitals a person chose are left alone", () => {
    assert.equal(properCase("McKenzie"), "McKenzie");
    assert.equal(properCase("DeShawn"), "DeShawn");
    assert.equal(properCase("O'Brien"), "O'Brien");
    assert.equal(properCase("Jean-Luc"), "Jean-Luc");
  });

  test("it never throws on the degenerate cases", () => {
    assert.equal(properCase(""), "");
    assert.equal(properCase("a"), "A");
  });
});

/**
 * WHAT THE DEMO WILL ACTUALLY CALL THEM — the string the review card shows a
 * reviewer as a promise about a page a church is going to receive.
 *
 * One function, called by the card AND by `generateDemo`, because a promise
 * computed by a second copy of the rule would come apart on exactly the churches
 * whose data is odd — which are the ones worth checking.
 */
describe("demoGreeting", () => {
  const FALLBACK = DEMO_MEMBER_FIRST_NAME;

  test("the lowest rank wins, titled or not", () => {
    const g = demoGreeting(
      [
        { name: "Ben Ellis", rank: 2 },
        { name: "Rev. Tom Blanchard", rank: 1 },
      ],
      FALLBACK,
    );
    assert.deepEqual(g, { name: "Tom", isDefault: false });
  });

  /**
   * THE SKIP THAT TRIPS PEOPLE UP. Rank 1 can be a church office address, or a
   * person whose name a reviewer has just cleared — the demo walks on down the
   * list rather than greeting nobody, and a preview that ignored that would
   * promise the wrong word on precisely those churches.
   */
  test("a blank name at rank 1 is passed over, not greeted", () => {
    const g = demoGreeting(
      [
        { name: "   ", rank: 1 },
        { name: "Sarah Vance", rank: 2 },
      ],
      FALLBACK,
    );
    assert.deepEqual(g, { name: "Sarah", isDefault: false });
  });

  test("ties keep source order", () => {
    const g = demoGreeting(
      [
        { name: "First Person", rank: 1 },
        { name: "Second Person", rank: 1 },
      ],
      FALLBACK,
    );
    assert.equal(g.name, "First");
  });

  /** `isDefault` is what puts the "default" chip on the card. It has to be true
   *  ONLY when nobody real was found — that is the whole claim it makes. */
  test("nobody usable falls back, and says so", () => {
    assert.deepEqual(demoGreeting([], FALLBACK), { name: FALLBACK, isDefault: true });
    assert.deepEqual(demoGreeting(null, FALLBACK), { name: FALLBACK, isDefault: true });
    assert.deepEqual(demoGreeting(undefined, FALLBACK), { name: FALLBACK, isDefault: true });
    assert.deepEqual(demoGreeting([{ name: "  " }], FALLBACK), { name: FALLBACK, isDefault: true });
  });

  /** A contact recorded as nothing but a title yields "" from `givenName`, which
   *  is a real answer — and must fall back rather than greet an empty string. */
  test("a contact who is only a title falls back", () => {
    assert.deepEqual(demoGreeting([{ name: "Pastor", rank: 1 }], FALLBACK), {
      name: FALLBACK,
      isDefault: true,
    });
  });

  test("the case is normalised, so the card shows what the page will say", () => {
    assert.equal(demoGreeting([{ name: "REV. TOM BLANCHARD", rank: 1 }], FALLBACK).name, "Tom");
    assert.equal(demoGreeting([{ name: "mark s. adams", rank: 1 }], FALLBACK).name, "Mark");
  });

  /**
   * AN UNRANKED PERSON IS SKIPPED, and that is deliberate rather than an
   * oversight — `demoFirstName` has always documented it as "people with no name
   * or no numeric rank are skipped". `Infinity < Infinity` is false, so nobody
   * unranked ever becomes `best`.
   *
   * It cannot bite on the real path: `contactsOf` numbers the shipping contacts
   * 1..N before they reach here, so an unranked person is one nothing produces.
   * Pinned because the behaviour is surprising when read, and because a future
   * caller that hands over raw contacts would silently get the stock member.
   */
  test("a person with no rank at all is not greeted", () => {
    assert.deepEqual(demoGreeting([{ name: "Dr. Karen Webb" }], FALLBACK), {
      name: FALLBACK,
      isDefault: true,
    });
    // …but one real rank anywhere in the list is enough.
    assert.equal(
      demoGreeting([{ name: "Dr. Karen Webb" }, { name: "Tom Blanchard", rank: 3 }], FALLBACK).name,
      "Tom",
    );
  });
});
