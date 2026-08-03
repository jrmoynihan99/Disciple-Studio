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
 * batch by `/api/leads/groups/<id>/palette`. That is the whole reason this is a
 * request rather than something read off the snapshot: the export takes the ramp
 * LIVE, so a preview built from the frozen entry would be a preview of a
 * different demo.
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

export function PalettePreview({
  palette,
  churchName,
}: {
  palette: PaletteState;
  churchName: string;
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
    </div>
  );
}
