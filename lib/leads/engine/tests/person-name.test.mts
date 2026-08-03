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

import { givenName } from "../person-name.ts";

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
