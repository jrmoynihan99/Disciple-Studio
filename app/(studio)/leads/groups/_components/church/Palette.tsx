"use client";

import type { ColorSet, ThemeOverrides } from "@/lib/types";
import { SKIN } from "./skin";

/**
 * WHAT THIS CHURCH'S DEMO WILL LOOK LIKE, before it exists.
 *
 * The rest of the card is about whether a sentence is true. This is the one block
 * that is about what gets SENT — a demo is a page in a church's own colours, and
 * until now the only way to find out which colours those were was to export the
 * batch and open the result. Two things go wrong that way round, and both of them
 * are quiet: a church whose logo yielded nothing gets the studio's default clay
 * and nobody knows until it has been sent, and a palette pulled off a dark logo
 * can produce a demo nobody would have chosen to send at all.
 *
 * THESE ARE THE REAL COLOURS, NOT AN APPROXIMATION OF THEM. The values come from
 * `mapTheme` — the same function `generateDemo` calls — resolved server-side per
 * batch by `/api/leads/groups/<id>/preview`. That is the whole reason this is a
 * request rather than something read off the snapshot: the export takes the ramp
 * LIVE, so a preview built from the frozen entry would be a preview of a
 * different demo.
 *
 * AND THEY ARE MEASURED FROM ONE PARTICULAR PICTURE, which is why this block now
 * names it. Every candidate logo carries its own ramp, so switching the logo
 * repaints these swatches — and a reviewer looking at a colour they did not
 * expect deserves to know it came from the mark they chose rather than from
 * somewhere unaccountable.
 *
 * NO LINKS IN HERE. `/leads/audit` asserts that the only `a[href]` on a card is
 * inside `[data-identity]`, which is what keeps `Visit` the single outbound link
 * a reviewer can click by accident. A swatch is a swatch.
 */

/** The palette a card has not heard back about yet — distinct from "there is none". */
export type PaletteState = ThemeOverrides | null | undefined;

/** The five that carry the look. `accentDeep` is the focal tile, so it ships. */
const SWATCHES = [
  ["bg", "Page background"],
  ["card", "Card surface"],
  ["ink", "Text"],
  ["accent", "Brand accent"],
  ["accentDeep", "Focal tile"],
] as const satisfies readonly (readonly [keyof ColorSet, string])[];

/**
 * One mode, drawn as the demo draws it.
 *
 * A row of five squares tells you the colours; it does not tell you whether they
 * WORK, which is the actual question — ink that vanishes into its background is
 * the failure this is here to catch, and five squares side by side hide it by
 * putting every colour on the same white card. So the tile is a miniature of the
 * real thing: a card on the page background, the church's name in the text
 * colour, and the call to action in the accent. The squares are underneath for
 * the hex.
 */
function ModeTile({
  mode,
  set,
  churchName,
}: {
  mode: "light" | "dark";
  set: Partial<ColorSet>;
  churchName: string;
}) {
  const bg = set.bg ?? "#ffffff";
  const card = set.card ?? bg;
  const ink = set.ink ?? "#111111";
  const inkSoft = set.inkSoft ?? ink;
  const line = set.line ?? "transparent";
  const accent = set.accent ?? ink;
  const onAccent = set.onAccent ?? "#ffffff";

  return (
    <div className="min-w-0 flex-1">
      <p className={SKIN.paletteMode}>{mode}</p>

      <div
        data-palette-tile={mode}
        className={SKIN.paletteTile}
        style={{ backgroundColor: bg }}
      >
        <div
          className="rounded-md border px-2.5 py-2"
          style={{ backgroundColor: card, borderColor: line }}
        >
          <div
            className="truncate text-[11px] leading-tight font-semibold"
            style={{ color: ink }}
          >
            {churchName || "This church"}
          </div>
          <div className="mt-1 text-[9px] leading-tight" style={{ color: inkSoft }}>
            Your next step
          </div>
          <div
            className="mt-1.5 inline-block rounded px-1.5 py-0.5 text-[8.5px] font-semibold"
            style={{ backgroundColor: accent, color: onAccent }}
          >
            Get started
          </div>
        </div>
      </div>

      {/* The hex is on `title` rather than printed: five labelled values per mode
          per church is forty strings of noise on a page whose job is prose, and
          the number only matters on the one occasion somebody disputes a colour. */}
      <div className="mt-1.5 flex items-center gap-1">
        {SWATCHES.map(([key, label]) => {
          const value = set[key];
          if (!value) return null;
          return (
            <span
              key={key}
              title={`${label} — ${value}`}
              className={SKIN.paletteSwatch}
              style={{ backgroundColor: value }}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * WHICH PICTURE THESE COLOURS CAME OUT OF.
 *
 * `gate` is the measurement's own account of itself: `""` means a brand colour
 * was found in the mark, anything else names why there was none to find. It is
 * NOT a failure — 40% of these logos are greyscale, and inventing a colour for
 * them is precisely the thing this pipeline refuses to do. Said plainly, because
 * "why is this church grey" is otherwise unanswerable from the card.
 */
const GATE: Record<string, string> = {
  greyscale: "This mark has no colour in it, so the demo takes its tone from the logo’s ink.",
  tie: "No single colour dominates this mark, so the demo takes its tone from the logo’s ink.",
  share_below_floor:
    "Too little of this mark is coloured to call it a brand colour, so the demo takes its tone from the logo’s ink.",
  many_colors:
    "This mark carries too many colours to single one out, so the demo takes its tone from the logo’s ink.",
  no_measurement: "The colours in this mark could not be measured, so the demo uses a derived tone.",
};

export interface PaletteSource {
  /** The reviewer chose a candidate other than the pipeline's pick. */
  switched: boolean;
  removed: boolean;
  hasLogo: boolean;
  /** Why there is no brand accent, or `""` if there is one. See `GATE`. */
  gate: string;
}

export function PalettePreview({
  palette,
  churchName,
  source,
}: {
  palette: PaletteState;
  churchName: string;
  source?: PaletteSource;
}) {
  return (
    <div data-palette className={SKIN.paletteBox}>
      <p className={SKIN.label}>Demo palette</p>

      {palette === undefined ? (
        <div className={`mt-2.5 h-[104px] w-full max-w-[340px] ${SKIN.skeleton}`} />
      ) : palette === null || (!palette.light && !palette.dark) ? (
        /**
         * A MEASURED ABSENCE, SAID OUT LOUD.
         *
         * `mapTheme` returns nothing when the church has no ramp — a greyscale
         * logo, or one we never got colours out of — and `generateDemo` then omits
         * `themeOverrides` entirely, so the demo ships the studio's default
         * preset. That is a real answer about what will be sent, and rendering
         * nothing here would let it read as a block that failed to load.
         */
        <p className={`mt-2 ${SKIN.absent}`}>
          No colours were extracted for this church. Its demo will use the
          studio&rsquo;s default theme rather than their own.
        </p>
      ) : (
        <div className="mt-2.5 flex max-w-[380px] flex-wrap gap-3">
          {palette.light && (
            <ModeTile mode="light" set={palette.light} churchName={churchName} />
          )}
          {palette.dark && <ModeTile mode="dark" set={palette.dark} churchName={churchName} />}
        </div>
      )}

      {/* THE PROVENANCE LINE. One sentence, and only when there is something a
          reviewer could not have worked out from the swatches: that they moved
          because of a choice they made, that they did not move when a logo was
          taken away, or that the church has no colour of its own. */}
      {palette !== undefined && source && (
        <>
          {source.switched && source.hasLogo && (
            <p className={`mt-2 ${SKIN.absent}`}>Measured from the logo you chose.</p>
          )}
          {source.removed && (
            <p className={`mt-2 ${SKIN.absent}`}>
              Measured from the logo you removed. The demo ships without the picture and keeps
              these colours.
            </p>
          )}
          {source.hasLogo && GATE[source.gate] && (
            <p className={`mt-1 ${SKIN.absent}`}>{GATE[source.gate]}</p>
          )}
        </>
      )}
    </div>
  );
}
