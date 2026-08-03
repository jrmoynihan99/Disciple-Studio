import type { ThemeOverrides } from "@/lib/types";

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
 * The candidates a reviewer may choose between
 * ------------------------------------------------------------------ */

/**
 * One image a church's demo could be built with.
 *
 * The pipeline picks one logo per church out of several candidates, and when it
 * picks wrong it picks wrong confidently — a cookie-consent badge, a
 * children's-ministry sub-brand, a photo of the building, a stock-photo cross.
 * Each of those had the church's real mark one row down the list. Which picture
 * represents a church is a judgement about an image: it cannot be cited and no
 * rule decided it reliably, so every candidate is offered and a person chooses.
 *
 * `theme` IS PER OPTION, and that is the field that makes the picker honest —
 * an icon and a wordmark from the same church routinely have opposite ink
 * polarity, so each tile has to be drawn on its own plate or half the menu is
 * invisible. `w`/`h`/`shape`/`kind` are how a reviewer tells a wordmark from a
 * favicon at a glance; `url` is where it came from, which is the only provenance
 * an image has.
 *
 * THE COLOURS FOLLOW THE PICTURE. Every candidate carries its own 13-token ramp,
 * measured from its own pixels, joined to it by `sha8` — so choosing a different
 * logo repaints the demo in that logo's colours rather than leaving it in the
 * ramp taken from the image the reviewer just rejected. `gate` is what that
 * measurement found: empty means a colour, anything else means the mark has none
 * and no accent was invented for it. See `paletteOfLogo`.
 */
export interface LogoOption {
  sha: string;
  ext: string;
  theme: string;
  /** How it was found: `header_logo_img`, `apple_touch_icon`, `inline_svg`, … */
  kind: string;
  /** `named` | `declared` | `positional` — how sure we are it is a logo at all. */
  confidence: string;
  /** `wordmark` | `icon` | `tall`. Most picks are wordmarks; most alternates are icons. */
  shape: string;
  w: number;
  h: number;
  url: string;
  /** The pipeline's own pick, as opposed to a runner-up. Always first. */
  ours: boolean;
  /**
   * Why this candidate has no brand accent, or `""` if it has one.
   *
   * `greyscale` (no colour in the mark at all), `tie` (no dominant hue),
   * `share_below_floor` (too little colour to trust), `many_colors`,
   * `no_measurement`. A gated option still gets full light and dark ramps — it
   * simply gets them without a colour of the church's own, which is a measured
   * fact about their logo and not a failure of the measurement.
   */
  gate: string;
  /**
   * The colours this option would paint the demo with, resolved server-side by
   * the same `mapTheme` the export calls. `null` is "this option yields no ramp,
   * so the demo would use the studio's default theme" — a real answer.
   * `undefined` is "nobody has resolved it", which is what this engine returns:
   * mapping needs the theme layer and this file stays pure.
   */
  colors?: ThemeOverrides | null;
}

interface RawAlt {
  sha?: unknown;
  ext?: unknown;
  kind?: unknown;
  confidence?: unknown;
  theme?: unknown;
  shape?: unknown;
  w?: unknown;
  h?: unknown;
  url?: unknown;
  palette?: Record<string, unknown>;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/**
 * Every image this church could be represented by — ours first, then the
 * runner-ups in the pipeline's own order (best first).
 *
 * OURS COMES FROM THE SNAPSHOT, NOT THE RECORD, because the logo sha lives on
 * the index row and nowhere else — `brand.logo_sha8` is an unrelated 8-hex
 * digest that 404s against the asset route. The snapshot froze the real one at
 * collect time; the record supplies only the four descriptors, which is why
 * option 0 needs no special case in the UI.
 *
 * A church with no pick of ours still gets a list: 241 of them have alternatives
 * and no logo at all, and for those this is the difference between an empty
 * plate and a choice.
 */
export function logoOptionsOf(
  ours: { sha: string; ext: string; theme: string } | null,
  record: unknown,
): LogoOption[] {
  const rec = (record ?? {}) as {
    brand?: Record<string, unknown>;
    logo_alts?: RawAlt[];
    logo_palette?: Record<string, unknown>;
  };
  const brand = rec.brand ?? {};
  const out: LogoOption[] = [];

  if (ours) {
    out.push({
      ...ours,
      kind: str(brand.logo_kind),
      confidence: str(brand.logo_confidence),
      shape: str(brand.logo_shape),
      w: num(brand.logo_w),
      h: num(brand.logo_h),
      url: str(brand.logo_url),
      ours: true,
      // The pick's palette is the record's own `logo_palette` — same object
      // shape, same pass, same gate vocabulary. Option 0 needs no special case
      // here either.
      gate: str((rec.logo_palette ?? {}).palette_gate),
    });
  }

  for (const a of Array.isArray(rec.logo_alts) ? rec.logo_alts : []) {
    const sha = str(a?.sha);
    // No sha, no bytes, no option. An option we cannot render is one we must not
    // offer — picking it would export a demo with no logo at all, silently.
    if (!sha) continue;
    out.push({
      sha,
      ext: str(a.ext),
      theme: str(a.theme),
      kind: str(a.kind),
      confidence: str(a.confidence),
      shape: str(a.shape),
      w: num(a.w),
      h: num(a.h),
      url: str(a.url),
      ours: false,
      gate: str((a.palette ?? {}).palette_gate),
    });
  }

  // One image cannot be two options. The archives are disjoint by construction
  // and upstream dedupes three ways, but this list is assembled from two sources
  // and a repeat here would render as two identical tiles.
  const seen = new Set<string>();
  return out.filter((o) => !seen.has(o.sha) && seen.add(o.sha));
}

/**
 * THE COLOURS THAT BELONG TO ONE PARTICULAR IMAGE.
 *
 * A demo is a page in a church's own colours, and "their colours" is a
 * measurement taken from a picture — 13 tokens per mode, read out of the pixels
 * of whichever logo was in hand. So the moment a reviewer can choose a different
 * picture, the ramp has to move with it, or the demo ships the colours of the
 * image they just rejected. At `rushcreek_org` the pipeline's pick is a
 * cookie-consent badge: every Rush Creek demo would have gone out in the
 * plugin's `#003399` while displaying the church's own mark.
 *
 * THE JOIN IS ON THE sha256, WHICH IS THE ONE THING WE HOLD. The palette's own
 * self-identification (`palette_sha8`) is a sha1 prefix, so it cannot be
 * recomputed from a sha256 — `leads-pack` asserts `palette_sha8 === sha8` on
 * every alternative at pack time instead, and this looks the alternative up by
 * the sha the reviewer actually picked.
 *
 * A sha that matches no alternative falls back to the record's own palette. That
 * covers the pipeline's pick (whose ramp IS `logo_palette`), a snapshot whose
 * logo predates a republish, and a removed logo — in all three the record's ramp
 * is both the best available answer and the one that ships today.
 */
export function paletteOfLogo(
  record: unknown,
  sha: string | null | undefined,
): Record<string, unknown> | null {
  const rec = (record ?? {}) as { logo_alts?: RawAlt[]; logo_palette?: Record<string, unknown> };
  if (sha) {
    for (const a of Array.isArray(rec.logo_alts) ? rec.logo_alts : []) {
      if (a?.sha === sha && a.palette && typeof a.palette === "object") return a.palette;
    }
  }
  return rec.logo_palette ?? null;
}

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
