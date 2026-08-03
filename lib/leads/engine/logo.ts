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

/* ------------------------------------------------------------------ *
 * Why there is no logo
 * ------------------------------------------------------------------ */

/**
 * WE HAD A PIPELINE TOKEN WHERE A SENTENCE BELONGED.
 *
 * `IndexRow.lr` carries the pipeline's own reason for rejecting a logo, and the
 * console printed it with the underscores swapped for spaces — so 260 churches
 * showed a 9px tile reading `photo by measured size`, which names an internal
 * heuristic and tells a reader nothing. Six values, 846 churches:
 *
 *   260  photo_by_measured_size            found one; its proportions were a photo
 *   206  only_a_share_card_or_icon         only an og:image or a favicon
 *   162  no_candidate_images_on_the_page   genuinely nothing to consider
 *   145  (blank)                           no reason recorded
 *    48  too_small                         found one, unusably small
 *    25  blank_image                       found one, and it was empty
 *
 * THE TILE NOW ALWAYS READS "No logo", AND THE REASON MOVES TO THE TOOLTIP.
 * A 54px tile with 9px text cannot carry a distinction, and six different
 * phrases in that space read as six different KINDS of failure rather than one
 * fact with six causes. The owner asked for exactly this: if it means no logo,
 * say no logo.
 *
 * The distinction is NOT discarded, because it is a real one — "we looked and
 * there was nothing" and "we found one and rejected it" are different facts, and
 * this codebase treats collapsing them as a defect. It moves to `title`, where
 * there is room for a sentence and where nobody has to decode a token.
 */
const LOGO_ABSENCE: Record<string, string> = {
  photo_by_measured_size:
    "An image was found, but its proportions measured as a photograph rather than a logo, so it was rejected.",
  only_a_share_card_or_icon:
    "Only a social share card or a browser icon was on the page. Neither is a logo.",
  no_candidate_images_on_the_page:
    "The page carried no image that could have been a logo.",
  too_small: "The only candidate found was too small to use.",
  blank_image: "The image found on the page was blank.",
};

/** What the tile says, and what hovering it explains. */
export interface LogoAbsence {
  label: string;
  title: string;
}

export function logoAbsence(reason: string | null | undefined): LogoAbsence {
  const key = (reason ?? "").trim();
  return {
    // One word for every cause. The tile is a place you notice something is
    // missing, not a place you find out why.
    label: "No logo",
    title:
      LOGO_ABSENCE[key] ??
      (key
        ? // An unrecognised token still beats silence, but it is marked as ours
          // rather than dressed up as an explanation.
          `No logo. The pipeline gave this reason and nothing here recognises it: "${key}".`
        : "No logo was found for this church, and no reason was recorded."),
  };
}
