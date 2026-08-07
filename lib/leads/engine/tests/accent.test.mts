/**
 * THE COLOUR A CHURCH'S DEMO IS PAINTED IN, when a person chose it.
 *
 * `withAccent` is applied twice — once by the review card, to show what the demo
 * will look like, and once by the export route, to build it — so the thing these
 * tests actually defend is that those two are the same answer. A preview that
 * drifts from the export is worse than no preview: it is an approval given for a
 * page nobody saw.
 *
 * The other half is the guardrail. One hex has to survive a demo that opens in
 * light OR dark and can be toggled either way, so the colour is nudged per mode
 * until it can be seen against that mode's background, and the label on top
 * flips by contrast. What is NOT tested here — because it is deliberately not a
 * rule — is taste: nothing refuses a colour, corrects it, or pulls it toward the
 * studio's palette.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { withAccent } from "../accent.ts";
import { contrastRatio, darken } from "../../../color.ts";

const RAMP = {
  light: { bg: "#ffffff", ink: "#111111", card: "#f7f7f7", accent: "#9e6450" },
  dark: { bg: "#101010", ink: "#f2f2f2", card: "#1a1a1a", accent: "#c98a6b" },
};

describe("a hand-picked accent", () => {
  test("replaces the measured accent in both modes and leaves the ramp alone", () => {
    const out = withAccent(RAMP, "#2563a8");
    assert.equal(out.light?.accent, "#2563a8");
    // The neutral ramp is measured from the logo's own plate and is what makes a
    // demo look like the church. Overwriting it would make every override look
    // like the same template with a colour swapped.
    assert.equal(out.light?.bg, "#ffffff");
    assert.equal(out.light?.ink, "#111111");
    assert.equal(out.dark?.bg, "#101010");
  });

  /** The derivation the whole repo uses for the focal tile. A preview that
   *  skipped it would show a swatch the demo does not ship. */
  test("the focal tile is derived from the chosen colour, not from the old one", () => {
    const out = withAccent(RAMP, "#2563a8");
    assert.equal(out.light?.accentDeep, darken(out.light!.accent!, 0.12));
    assert.equal(out.dark?.accentDeep, darken(out.dark!.accent!, 0.12));
  });

  /**
   * A CHURCH WITH NO MEASURED RAMP IS THE CASE THIS EXISTS FOR.
   *
   * 40% of these marks are greyscale, `mapTheme` returns nothing for them and
   * their demos ship the studio's default preset — which is exactly the church
   * most likely to need somebody to say "their site is navy". `themeOverrides`
   * merges over the preset (see `lib/themes.ts`), so an accent-only override is
   * a complete answer, and returning nothing would silently drop the one
   * decision a person made by hand.
   */
  test("a church with no ramp still gets the accent, as a partial override", () => {
    for (const empty of [null, undefined]) {
      const out = withAccent(empty, "#1f3a5f");
      assert.ok(out.light?.accent, "the override was dropped for a church with no ramp");
      assert.ok(out.dark?.accent);
      assert.ok(out.light?.onAccent, "a filled swatch with no ink on it is unreadable");
      assert.equal(out.light?.bg, undefined, "an override must not invent a background");
    }
  });

  test("a colour that cannot be parsed changes nothing", () => {
    for (const bad of ["", "red", "#12345", "rgb(1,2,3)", "url(x)"]) {
      assert.deepEqual(withAccent(RAMP, bad), RAMP, `"${bad}" was treated as a colour`);
    }
    assert.deepEqual(withAccent(null, "nonsense"), {});
  });
});

describe("the guardrail", () => {
  /** Where the accent stops being distinguishable from the page behind it. The
   *  number is `FLOOR` in `accent.ts`; a change to either should fail here. */
  const FLOOR = 2.2;

  /**
   * THE CASE A ONE-COLOUR OVERRIDE GETS WRONG WITHOUT THIS.
   *
   * A navy that is right on the church's white homepage is a smudge on the dark
   * page the same demo opens in — and which mode a demo opens in is decided by
   * the logo's polarity, not by the reviewer. The colour is lifted for that mode
   * rather than refused, because refusing "their navy" would be answering a
   * question nobody asked.
   */
  test("a dark colour is lifted until it can be seen on the dark page", () => {
    const out = withAccent(RAMP, "#0b1a2e");
    assert.ok(
      contrastRatio(out.dark!.accent!, RAMP.dark.bg) >= FLOOR,
      `${out.dark!.accent} still vanishes into ${RAMP.dark.bg}`,
    );
    // …and the light mode keeps the colour that was actually chosen.
    assert.equal(out.light?.accent, "#0b1a2e");
  });

  test("a near-white colour is deepened until it can be seen on the light page", () => {
    const out = withAccent(RAMP, "#fdfdf8");
    assert.ok(
      contrastRatio(out.light!.accent!, RAMP.light.bg) >= FLOOR,
      `${out.light!.accent} still vanishes into ${RAMP.light.bg}`,
    );
    assert.equal(out.dark?.accent, "#fdfdf8", "the dark page needed no help and got none");
  });

  /**
   * The label on a filled accent is what makes it a button rather than a block
   * of colour. White on pale gold is the failure; it flips to near-black.
   */
  test("the ink on the accent flips by contrast, not by assumption", () => {
    assert.equal(withAccent(RAMP, "#1f3a5f").light?.onAccent, "#ffffff");
    assert.equal(withAccent(RAMP, "#f2d16b").light?.onAccent, "#141414");
    for (const hex of ["#1f3a5f", "#f2d16b", "#9e6450", "#0f766e", "#b3812c"]) {
      const out = withAccent(RAMP, hex);
      for (const set of [out.light!, out.dark!]) {
        assert.ok(
          contrastRatio(set.accent!, set.onAccent!) >= 3,
          `${set.onAccent} on ${set.accent} is not readable`,
        );
      }
    }
  });

  /** Most picks are ordinary and must come out exactly as chosen — a guardrail
   *  that fires on everything is a colour picker that does not work. */
  test("a colour that already works is passed through untouched", () => {
    for (const hex of ["#2563a8", "#9e6450", "#3f6f4a", "#7c4a8d", "#a8442a"]) {
      const out = withAccent(RAMP, hex);
      assert.equal(out.light?.accent, hex, `${hex} was adjusted on the light page`);
      assert.equal(out.dark?.accent, hex, `${hex} was adjusted on the dark page`);
    }
  });
});
