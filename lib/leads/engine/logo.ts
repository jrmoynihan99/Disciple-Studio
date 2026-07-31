/**
 * Which plate a logo is drawn on.
 *
 * The pipeline classifies every logo's ink as `light` / `dark` / `either` /
 * `unknown` (`brand.logo_theme`, `lt` in the slim index). Three plates, and the
 * choice between them is a HONESTY decision, not a styling one:
 *
 *   dark    -> #2b2b30    a near-white cut-out. On white it is invisible, and
 *                         invisible is indistinguishable from "no logo found".
 *   light   -> #ffffff    dark ink, drawn for a white page. This is what the
 *   either  -> #ffffff    church actually designed against; the beige plate
 *                         tints it and makes every logo look slightly wrong.
 *                         `either` reads on both by definition, so white is
 *                         safe for it too.
 *   unknown -> checker    WE DO NOT KNOW THE INK POLARITY. The beige + 45°
 *                         checker is the only plate that reads both, and it
 *                         makes transparency visible. Guessing white here is
 *                         the failure the rule was written for — 32 of 80
 *                         churches in one review batch carry a white cut-out.
 *
 * That last row is the whole reason the checkerboard still exists. It is the
 * fallback for the unclassified, not the default for everything that is not
 * dark. Anyone widening white to cover `unknown` is re-taking the bet this
 * function exists to refuse.
 *
 * `unknown` is 0 of 134 in the fixture and WILL be non-zero at 14,400 — the
 * branch is real, it is simply untested by the sample. See `logo.test.mts`.
 */
export type LogoTheme = "light" | "dark" | "either" | "unknown";

export type LogoPlate = "white" | "dark" | "checker";

export function logoPlate(lt: string | null | undefined): LogoPlate {
  switch (lt) {
    case "dark":
      return "dark";
    case "light":
    case "either":
      return "white";
    default:
      // Includes "unknown", null, undefined, and any value a future pipeline
      // starts emitting. An unrecognised classification is not a light one.
      return "checker";
  }
}

/** The utility class each plate maps to. One place, so the two cannot drift. */
export const PLATE_CLASS: Record<LogoPlate, string> = {
  white: "lead-plate-white",
  dark: "lead-checkerboard-dark",
  checker: "lead-checkerboard",
};
