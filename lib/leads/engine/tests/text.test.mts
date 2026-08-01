/**
 * Entity decoding for scraped display text.
 *
 * The input is church-controlled and the output is rendered next to a real
 * church's name, so the two failure modes are opposite and both matter: leaving
 * `Int&#39;l` on screen reads as corrupted data, and inventing characters that
 * were never on the page is a claim we cannot cite.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { decodeEntities } from "../text.ts";
import { recordLabel } from "../labels.ts";

describe("decodeEntities", () => {
  test("decodes what a scraper actually emits", () => {
    assert.equal(decodeEntities("759 W Int&#39;l Ave"), "759 W Int'l Ave");
    assert.equal(decodeEntities("Bright &amp; Early"), "Bright & Early");
    assert.equal(decodeEntities("&quot;Grace&quot;"), '"Grace"');
    assert.equal(decodeEntities("St&#x2019;s"), "St’s");
    assert.equal(decodeEntities("a&nbsp;b"), "a b");
  });

  test("leaves text with no entities completely alone", () => {
    for (const s of ["plain text", "a & b", "100% & rising", ""]) {
      assert.equal(decodeEntities(s), s);
    }
  });

  /**
   * An unknown name is NOT a licence to guess. Printing something the church did
   * not write is worse than printing the entity.
   */
  test("an unrecognised entity is left exactly as found", () => {
    assert.equal(decodeEntities("&hellip;"), "&hellip;");
    assert.equal(decodeEntities("&notarealentity;"), "&notarealentity;");
    assert.equal(decodeEntities("&#xZZZZ;"), "&#xZZZZ;");
    assert.equal(decodeEntities("&#99999999;"), "&#99999999;");
  });

  /** Control characters and lone surrogates would render as nothing at all. */
  test("refuses code points that would vanish on screen", () => {
    assert.equal(decodeEntities("&#0;"), "&#0;");
    assert.equal(decodeEntities("&#7;"), "&#7;", "BEL");
    assert.equal(decodeEntities("&#xD800;"), "&#xD800;", "lone surrogate");
  });

  /**
   * The result is rendered as a TEXT NODE. Decoding `&lt;script&gt;` therefore
   * yields the visible characters `<script>` and nothing executes — but this
   * pins the contract, because the day someone routes this into
   * `dangerouslySetInnerHTML` the decode becomes an injection.
   */
  test("decodes markup to characters, and it must stay a text node", () => {
    assert.equal(
      decodeEntities("&lt;script&gt;alert(1)&lt;/script&gt;"),
      "<script>alert(1)</script>",
    );
  });

  test("never throws, whatever it is handed", () => {
    for (const junk of [null, undefined, 42, {}, [], "&&&;;;", "&#;"]) {
      assert.equal(typeof decodeEntities(junk), "string");
    }
  });
});

describe("recordLabel", () => {
  test("drops the dangling q3 cross-reference and nothing else", () => {
    const real =
      "No explicit discipleship language. However, the church provides multiple clear next steps, " +
      "implying they may have an interest in an organized discipleship process. See Q3 for details.";
    const out = recordLabel(real);
    assert.ok(!/\bQ\d/.test(out), "no literal question number may survive");
    assert.ok(out.endsWith("organized discipleship process."), "the finding itself is untouched");
  });

  test("labels without the cross-reference are returned verbatim", () => {
    for (const s of [
      "Has organized discipleship pathway",
      "Discipleship language present but generic/ambiguous",
      "No login link on the homepage",
    ]) {
      assert.equal(recordLabel(s), s);
    }
  });

  test("it strips the reference, not every mention of a question", () => {
    // Only the trailing boilerplate goes. A label that legitimately discusses
    // something mid-sentence keeps its words.
    assert.equal(recordLabel("Q3 pages were read."), "Q3 pages were read.");
  });

  test("never throws", () => {
    for (const junk of [null, undefined, 42, {}]) {
      assert.equal(typeof recordLabel(junk), "string");
    }
  });
});
