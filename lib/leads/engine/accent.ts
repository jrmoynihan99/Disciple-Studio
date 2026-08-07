/**
 * RELATIVE, WITH THE EXTENSION — the engine's import rule, and the reason this
 * file lives here rather than beside `lib/color.ts` where it started. `node
 * --test` resolves no path alias, so an aliased runtime import would put this
 * rule beyond the reach of the suite that runs on every `npm run verify`; the
 * colour a church's demo is painted in is not a rule to leave untested. The
 * TYPE import below keeps its alias because types are erased before Node sees
 * them — the same split `demo-export.ts` makes.
 */
import { contrastRatio, darken, inkOn, lighten, luminance } from "../../color.ts";
import type { ColorSet, ThemeOverrides } from "@/lib/types";

/**
 * WHAT A HAND-PICKED BRAND COLOUR DOES TO A DEMO'S PALETTE.
 *
 * The accent a demo is painted with is measured from the church's logo, and the
 * measurement is right most of the time and has no way to be wrong out loud: 40%
 * of these marks are greyscale and fall through to the studio's clay, and a
 * church whose site is unmistakably one colour can ship in another because its
 * logo happens to be a black wordmark. This is the override — the reviewer looks
 * at the church's site, picks the colour, and the demo is painted in it.
 *
 * ONE FUNCTION, APPLIED TWICE, WHICH IS THE POINT. The review card previews the
 * palette by calling this on the colours the preview route resolved, and the
 * export calls it on the colours `mapTheme` resolved at build time. Both are a
 * `ThemeOverrides`, both go through here, so the swatch a reviewer approved and
 * the page a church opens cannot come apart — which a second "read the accent,
 * darken it 12%" in a component absolutely would, the first time either changed.
 *
 * IT CHANGES THE ACCENT AND NOTHING ELSE. The neutral ramp — background, ink,
 * card, lines — is measured from the logo's own plate and is what makes a demo
 * look like the church rather than like a template with a colour swapped. This
 * writes three tokens: the accent, the deep accent derived from it exactly as
 * the rest of the repo derives it, and the ink that goes ON it.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE GUARDRAIL, AND WHAT IT IS AND IS NOT FOR.
 *
 * A demo opens in light or dark depending on the church's logo and the viewer
 * can toggle either way, so ONE chosen hex has to survive both. A navy that
 * looks right on white is a smudge on a near-black page; a pale gold that works
 * in dark mode is a white pill on a white page. So the colour is nudged per mode
 * — toward white on a dark background, toward black on a light one — until it
 * clears a floor against that mode's own background, and the label on top flips
 * between white and near-black by contrast rather than by assumption.
 *
 * IT IS NOT A TASTE FILTER. Nothing here refuses a colour, corrects a "bad"
 * one, or pulls it toward the warm palette: the reviewer is looking at the
 * church's website and this is their call. The floor is 2.2:1, which is well
 * below text contrast on purpose — an accent is a filled surface with its own
 * label, not text on the background — and is only there to stop a colour
 * dissolving into the page entirely. Most picks are untouched by it.
 * ────────────────────────────────────────────────────────────────────────────
 */

/** Where the accent stops being distinguishable from the page behind it. */
const FLOOR = 2.2;

/**
 * The backgrounds assumed when a church has no measured ramp of its own.
 *
 * Those demos ship the studio's default preset and `themeOverrides` merges over
 * it (see `lib/themes.ts`), so the real background is the preset's — these are
 * close enough for a nudge that only fires at the extremes, and being slightly
 * off can only mean a colour is adjusted a step it did not need or spared one it
 * marginally did.
 */
const ASSUMED_BG = { light: "#ffffff", dark: "#111111" };

/**
 * Nudge a colour away from a background until it can be seen against it.
 *
 * Small steps rather than one big correction: the aim is the reviewer's colour,
 * recognisably, and a 6% mix repeated is the smallest move that reaches the
 * floor from anywhere. The loop is bounded — a colour that cannot clear the
 * floor in twelve steps is being asked to be readable against itself, and
 * returning the last attempt is a better answer than looping.
 */
function fit(accent: string, bg: string): string {
  const towardWhite = luminance(bg) < 0.5;
  let out = accent;
  for (let i = 0; i < 12 && contrastRatio(out, bg) < FLOOR; i++) {
    out = towardWhite ? lighten(out, 0.06) : darken(out, 0.06);
  }
  return out;
}

function mode(
  set: Partial<ColorSet> | undefined,
  accent: string,
  assumedBg: string,
): Partial<ColorSet> {
  const fitted = fit(accent, set?.bg ?? assumedBg);
  return {
    ...set,
    accent: fitted,
    // `darken(accent, 0.12)` — the derivation the whole repo uses for the focal
    // tile. Restating it differently here would give a preview one deep accent
    // and the demo another.
    accentDeep: darken(fitted, 0.12),
    onAccent: inkOn(fitted),
  };
}

/**
 * A palette with the reviewer's accent in it.
 *
 * `null`/`undefined` in is a church with no measured ramp — the demo ships the
 * studio's default preset — and the answer is a partial override carrying only
 * the accent tokens, which is exactly what merging over that preset needs.
 * Returning nothing in that case would silently drop the one override somebody
 * made by hand, on precisely the churches (greyscale logos) most likely to need
 * one.
 */
export function withAccent(
  theme: ThemeOverrides | null | undefined,
  accent: string,
): ThemeOverrides {
  const hex = accent.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return theme ?? {};
  return {
    ...theme,
    light: mode(theme?.light, hex, ASSUMED_BG.light),
    dark: mode(theme?.dark, hex, ASSUMED_BG.dark),
  };
}
