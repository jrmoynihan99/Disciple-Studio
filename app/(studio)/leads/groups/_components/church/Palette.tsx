"use client";

import { useEffect, useRef, useState } from "react";
import { withAccent } from "@/lib/leads/engine/accent";
import type { ColorSet, ThemeOverrides } from "@/lib/types";
import { SKIN } from "./skin";
import { useReadOnly } from "../ReadOnly";

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
  /**
   * THE FALLBACKS ARE PER MODE, and that is not cosmetic tidying.
   *
   * A church with no measured ramp whose accent a reviewer set by hand resolves
   * to a palette carrying the accent tokens and nothing else — its demo ships
   * the studio's default preset with that accent merged over it. Defaulting both
   * tiles to a white page would then draw the dark mode as a light one, which is
   * a preview of a page that does not exist. These two stand in for the preset's
   * own backgrounds, and match the assumption `withAccent` makes when it decides
   * whether a colour can be seen against them.
   */
  const bg = set.bg ?? (mode === "dark" ? "#111111" : "#ffffff");
  const card = set.card ?? bg;
  const ink = set.ink ?? (mode === "dark" ? "#f2f2f2" : "#111111");
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

/**
 * THE COLOURS OFFERED WHEN THE MEASUREMENT IS NOT THEIRS.
 *
 * Not a designer's palette and not a rainbow: these are the colours church
 * brands actually come in, which is why there are three blues and two greens and
 * no magenta. The list is a shortcut for the common case — you are looking at
 * their site and it is obviously navy — and the picker beside it is the answer
 * for everything else, so this does not have to be complete to be useful.
 *
 * The first is the studio's own clay, because "the default, on purpose" is a
 * real choice for a church whose site is genuinely colourless and it should not
 * require finding the hex.
 */
const PRESETS: readonly (readonly [string, string])[] = [
  ["#9e6450", "clay — the studio default"],
  ["#1f3a5f", "navy"],
  ["#2563a8", "blue"],
  ["#0f766e", "teal"],
  ["#3f6f4a", "green"],
  ["#7c4a8d", "plum"],
  ["#a8442a", "brick"],
  ["#b3812c", "gold"],
  ["#6b4423", "walnut"],
  ["#3f3f46", "slate"],
];

/**
 * Pick the colour the demo is painted in.
 *
 * IT SITS UNDER THE TILES IT CHANGES. The two miniatures above are the whole
 * argument for letting anybody do this — a swatch row on its own is a colour
 * chooser, a swatch row under a rendered card and a rendered button is a
 * decision with its consequence attached, and the consequence is the thing that
 * stops somebody shipping a demo in a colour that cannot hold its own label.
 */
function AccentPicker({
  accent,
  measured,
  onPick,
  onAccent,
}: {
  /** The colour on screen right now — the committed one, or a live drag. */
  accent: string;
  /** What the logo measured, for the swatch that puts it back. */
  measured: string;
  /** Paint this colour now, without committing it. See `commit` below. */
  onPick: (hex: string) => void;
  onAccent: (hex: string | null) => void;
}) {
  /**
   * ONE OPERATION PER COLOUR, NOT ONE PER PIXEL OF THE DRAG.
   *
   * A native colour input fires `input` continuously while the eyedropper or
   * the gradient is being dragged — sixty events for one decision. Every one of
   * those would be an op in the save queue, a line in the PATCH, and a tick on
   * the "N changes pending" counter that tells somebody whether it is safe to
   * close the tab. So the colour is PAINTED immediately and STORED once the hand
   * stops moving, which is the same bargain `EditableText` makes by committing
   * on blur rather than on every keystroke.
   */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commit = (hex: string) => {
    onPick(hex);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onAccent(hex), 250);
  };
  // A pending colour must not outlive the card that chose it.
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  // A sent batch is a record. Its demos are built and their links may be with
  // the churches; repainting the record would change neither.
  if (useReadOnly()) return null;

  return (
    <div className="mt-3">
      <p className={SKIN.paletteMode}>Brand accent</p>
      <div className={SKIN.swatchRow}>
        {PRESETS.map(([hex, name]) => (
          <button
            key={hex}
            type="button"
            aria-label={`Use ${name}`}
            aria-pressed={accent === hex}
            title={`${name} — ${hex}`}
            onClick={() => {
              onPick(hex);
              onAccent(hex);
            }}
            className={accent === hex ? SKIN.swatchOn : SKIN.swatch}
            style={{ backgroundColor: hex }}
          />
        ))}

        {/* THE WAY TO A COLOUR THAT IS NOT ON THE ROW. Native, because the OS
            picker has an eyedropper on every desktop platform and a church's
            exact blue is one pick away from their own homepage. */}
        <input
          type="color"
          aria-label="Pick any colour"
          title="Pick any colour — including with the eyedropper, straight off their site"
          value={accent || measured || "#9e6450"}
          onChange={(e) => commit(e.target.value)}
          // The dialog closing returns focus here, and a colour chosen and then
          // navigated away from must not be lost to a timer that never fired.
          onBlur={(e) => {
            if (timer.current) clearTimeout(timer.current);
            if (e.target.value !== accent) onAccent(e.target.value);
          }}
          className={SKIN.swatchCustom}
        />

        {accent && (
          <button
            type="button"
            onClick={() => onAccent(null)}
            title="Go back to the colour measured from their logo"
            className={`ml-1 ${SKIN.btnSmall}`}
          >
            back to theirs
          </button>
        )}
      </div>
      <p className={`mt-1.5 ${SKIN.absent}`}>
        {accent
          ? "Your colour. The tiles above are what the demo will look like — it is lifted or deepened per mode so it can be seen on both."
          : "Measured from their logo. Override it if their site is obviously a different colour."}
      </p>
    </div>
  );
}

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
  accent = "",
  onAccent,
}: {
  palette: PaletteState;
  churchName: string;
  source?: PaletteSource;
  /** The reviewer's accent override, or `""` for the measured one. */
  accent?: string;
  /** Absent on a surface with no way to change it (the audit's probes). */
  onAccent?: (hex: string | null) => void;
}) {
  /**
   * THE OVERRIDE IS APPLIED HERE, THROUGH THE FUNCTION THE EXPORT USES.
   *
   * `withAccent` is what the export route calls on the finished config, so these
   * tiles are the demo's actual colours rather than a component's impression of
   * them — including the per-mode lift that stops a navy vanishing on the dark
   * page. Re-deriving it here ("set accent, darken 12%") would be right until
   * the day one of the two changed, which is the failure `mapTheme`'s own
   * comment was written about.
   *
   * `undefined` — the batch's palette request has not landed — is left alone: a
   * skeleton is the honest answer, and painting accent-only tiles under it would
   * show a background that is not the church's.
   */
  /**
   * The colour under the hand, before it is a stored decision.
   *
   * The tiles have to repaint while the picker is being dragged — they are the
   * whole reason anybody can be trusted with this control — but a stored op per
   * frame is not a decision, it is a smear across the save queue. So the drag
   * lives here and `AccentPicker` commits once it stops; see the note there.
   */
  const [draft, setDraft] = useState<string | null>(null);
  const live = draft ?? accent;

  const shown = palette !== undefined && live ? withAccent(palette, live) : palette;
  const measured = (palette && (palette.light?.accent || palette.dark?.accent)) || "";
  /** The church has no ramp of its own — asked of the MEASUREMENT, not of the
   *  override, so an accent chosen by hand does not make the absence disappear. */
  const noRamp = palette === null || (!!palette && !palette.light && !palette.dark);

  return (
    <div data-palette className={SKIN.paletteBox}>
      <p className={SKIN.label}>Demo palette</p>

      {shown === undefined ? (
        <div className={`mt-2.5 h-[104px] w-full max-w-[340px] ${SKIN.skeleton}`} />
      ) : noRamp && !live ? (
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
          No colours were extracted for this church. Its demo will use the studio&rsquo;s default
          theme rather than their own — give it their colour below.
        </p>
      ) : (
        <div className="mt-2.5 flex max-w-[380px] flex-wrap gap-3">
          {shown?.light && <ModeTile mode="light" set={shown.light} churchName={churchName} />}
          {shown?.dark && <ModeTile mode="dark" set={shown.dark} churchName={churchName} />}
        </div>
      )}

      {/* THE ABSENCE STILL GETS SAID when an accent has been chosen over it —
          the tiles above are now the studio's default theme wearing that colour,
          and a reviewer who cannot tell that from a measured palette has no way
          to know the neutral tones are not the church's. */}
      {noRamp && live && (
        <p className={`mt-2 ${SKIN.absent}`}>
          No colours were extracted for this church, so this is the studio&rsquo;s default theme
          painted with the accent you chose.
        </p>
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

      {/* Held back until the measurement has landed. Offering "back to theirs"
          before we know what theirs is would be offering a button that cannot
          say what it does. */}
      {palette !== undefined && onAccent && (
        <AccentPicker
          accent={live}
          measured={measured}
          onPick={setDraft}
          onAccent={(hex) => {
            // `null` is "back to theirs", and the live drag has to go with it —
            // otherwise the tiles keep showing a colour the card no longer has.
            if (hex === null) setDraft(null);
            onAccent(hex);
          }}
        />
      )}
    </div>
  );
}
