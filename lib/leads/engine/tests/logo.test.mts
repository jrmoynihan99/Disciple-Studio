/**
 * Which plate a logo is drawn on.
 *
 * A logo that renders white-on-white is indistinguishable from a logo we never
 * found, so the plate choice decides whether the tile tells the truth about our
 * own data. `logoPlate` is a pure function precisely so that decision is
 * testable here rather than only by looking at 134 thumbnails.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { PLATE_CLASS, logoPlate, logoOptionsOf, paletteOfLogo } from "../logo.ts";
import { HAVE_FIXTURE, loadIndex } from "./fixture.mts";

describe("logo plates", () => {
  test("a classified light logo gets white, which is what it was drawn for", () => {
    assert.equal(logoPlate("light"), "white");
    assert.equal(logoPlate("either"), "white", "reads on both by definition");
  });

  test("a cut-out gets the dark plate", () => {
    assert.equal(logoPlate("dark"), "dark");
  });

  /**
   * THE BRANCH THE FIXTURE CANNOT REACH.
   *
   * `unknown` is 0 of 134 here and will not be at 14,400. If it ever resolved to
   * white, every unclassified white cut-out would vanish into the tile and read
   * as "no logo found" — reporting missing data we actually have.
   */
  test("an unknown or unrecognised polarity falls back to the checkerboard", () => {
    assert.equal(logoPlate("unknown"), "checker");
    assert.equal(logoPlate(null), "checker");
    assert.equal(logoPlate(undefined), "checker");
    assert.equal(logoPlate(""), "checker");
    // A value a future pipeline invents is not a licence to guess white.
    assert.equal(logoPlate("mid-tone"), "checker");
    assert.equal(logoPlate("LIGHT"), "checker", "the vocabulary is lower-case; do not fuzzy-match");
  });

  test("the three plates map to three distinct classes", () => {
    const classes = Object.values(PLATE_CLASS);
    assert.equal(new Set(classes).size, 3, "two plates sharing a class is one plate");
    assert.ok(classes.every(Boolean));
  });

  test(
    "every logo_theme the fixture publishes is one we handle",
    { skip: !HAVE_FIXTURE && "fixture not present" },
    () => {
      const seen = new Map<string, number>();
      for (const r of loadIndex()) {
        if (!r.lo || !r.lx) continue;
        const lt = r.lt ?? "(absent)";
        seen.set(lt, (seen.get(lt) ?? 0) + 1);
      }
      // Documented vocabulary: light / dark / either / unknown.
      for (const lt of seen.keys()) {
        assert.ok(
          ["light", "dark", "either", "unknown", "(absent)"].includes(lt),
          `unexpected logo_theme "${lt}" — decide its plate before it ships`,
        );
      }
      // A publish that stops classifying is what this catches. It used to pin
      // the exact split, which described one 134-church sample; on any corpus
      // the fact worth protecting is that the classifier still returns real
      // polarities rather than sending everything to the unknown plate — which
      // is the branch that silently makes every tile beige.
      assert.ok((seen.get("dark") ?? 0) > 0, "no dark-ink logos — the classifier stopped");
      assert.ok((seen.get("light") ?? 0) > 0, "no light-ink logos — the classifier stopped");
      const classified = (seen.get("dark") ?? 0) + (seen.get("light") ?? 0) + (seen.get("either") ?? 0);
      const total = [...seen.values()].reduce((a, b) => a + b, 0);
      assert.ok(
        classified > total / 2,
        `only ${classified} of ${total} logos carry a polarity — most tiles will fall back to the checker plate`,
      );
    },
  );
});

/**
 * THE MENU A REVIEWER PICKS FROM.
 *
 * The pipeline chooses one logo per church and is confidently wrong often enough
 * to matter — a cookie badge, a sub-brand, a photo of the building. Which picture
 * represents a church is a judgement about an image, so every candidate is
 * offered and a person decides. What this list gets wrong, the reviewer cannot
 * see: an option that renders as a broken tile, or one missing from the menu
 * entirely, both look like "this church only has the one".
 */
describe("the logo options a church offers", () => {
  const OURS = { sha: "a".repeat(64), ext: "svg", theme: "light" };
  const ALT_A = "b".repeat(64);
  const ALT_B = "c".repeat(64);

  const record = {
    brand: {
      logo_kind: "header_logo_img",
      logo_confidence: "named",
      logo_shape: "wordmark",
      logo_w: 600,
      logo_h: 97,
      logo_url: "https://example.org/logo.svg",
    },
    logo_palette: { palette_gate: "greyscale" },
    logo_alts: [
      {
        sha: ALT_A,
        sha8: "87622514",
        ext: "png",
        kind: "apple_touch_icon",
        confidence: "declared",
        theme: "dark",
        shape: "icon",
        w: 180,
        h: 180,
        url: "https://example.org/apple-touch-icon.png",
        palette: { palette_sha8: "87622514", palette_gate: "", accent_light: "#009cff" },
      },
      {
        sha: ALT_B,
        sha8: "3c9386a2",
        ext: "png",
        kind: "page_logo_img",
        confidence: "positional",
        theme: "light",
        shape: "wordmark",
        w: 400,
        h: 80,
        url: "https://example.org/mark.png",
        palette: { palette_sha8: "3c9386a2", palette_gate: "tie" },
      },
    ],
  };

  test("ours is first, described by the record's own brand fields", () => {
    const opts = logoOptionsOf(OURS, record);
    assert.equal(opts.length, 3);
    assert.equal(opts[0].ours, true);
    assert.equal(opts[0].sha, OURS.sha);
    assert.equal(opts[0].kind, "header_logo_img");
    assert.equal(opts[0].w, 600);
    assert.equal(opts[1].ours, false);
  });

  /**
   * 241 CHURCHES HAVE ALTERNATIVES AND NO PICK. For those this list is the
   * difference between an empty plate and a choice, so "no logo of ours" must
   * not be read as "no options".
   */
  test("a church with no pick still gets a menu", () => {
    const opts = logoOptionsOf(null, record);
    assert.equal(opts.length, 2);
    assert.ok(opts.every((o) => !o.ours));
  });

  /**
   * `theme` IS PER OPTION, and it is the field that keeps the menu visible: an
   * icon and a wordmark from one church routinely have opposite ink polarity, so
   * a picker that drew them all on one plate would hide half of them.
   */
  test("each option carries its own ink polarity", () => {
    const opts = logoOptionsOf(OURS, record);
    assert.deepEqual(opts.map((o) => o.theme), ["light", "dark", "light"]);
    assert.deepEqual(opts.map((o) => logoPlate(o.theme)), ["white", "dark", "white"]);
  });

  /**
   * `gate` is the measurement's own account of why an option has no brand colour.
   * It comes from EACH option's palette — 6,740 of 19,803 alternatives are gated
   * while their church's pick is not, and vice versa, so reading one church's
   * gate for every tile would label the wrong ones.
   */
  test("the gate is per option, not per church", () => {
    const opts = logoOptionsOf(OURS, record);
    assert.deepEqual(opts.map((o) => o.gate), ["greyscale", "", "tie"]);
  });

  /** An option we cannot render is one we must not offer: picking it exports a
   *  demo with no logo at all, silently. */
  test("a candidate with no sha is not offered", () => {
    const opts = logoOptionsOf(null, { logo_alts: [{ sha: "", ext: "png" }, { ext: "png" }] });
    assert.equal(opts.length, 0);
  });

  test("one image cannot be two tiles", () => {
    const opts = logoOptionsOf({ sha: ALT_A, ext: "png", theme: "dark" }, record);
    assert.equal(opts.length, 2);
    assert.equal(opts.filter((o) => o.sha === ALT_A).length, 1);
  });

  test("nothing at all is an empty menu, not a crash", () => {
    assert.deepEqual(logoOptionsOf(null, null), []);
    assert.deepEqual(logoOptionsOf(null, { logo_alts: "not an array" }), []);
  });

  /** The join the colours ride on — see `paletteOfLogo`. */
  test("a sha resolves to the palette measured from that sha", () => {
    assert.equal(paletteOfLogo(record, ALT_A)?.palette_sha8, "87622514");
    assert.equal(paletteOfLogo(record, ALT_B)?.palette_gate, "tie");
    assert.equal(paletteOfLogo(record, OURS.sha)?.palette_gate, "greyscale");
    assert.equal(paletteOfLogo(record, null)?.palette_gate, "greyscale");
    assert.equal(paletteOfLogo(null, ALT_A), null);
  });
});
