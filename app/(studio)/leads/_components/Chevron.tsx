/**
 * The open/closed chevron.
 *
 * Was the text glyph `⌄` (U+2304). A glyph is laid out on a font's baseline with
 * that font's own side bearings, so it sat low and off-centre in its box — and
 * `rotate-180` spins it about the BOX centre, not the glyph's, so the open state
 * was visibly worse than the closed one. Neither is fixable with padding,
 * because the offset changes with the font.
 *
 * An SVG is drawn in its own square viewBox, so it is centred by construction
 * and rotation is symmetric. It also inherits `currentColor` and stays crisp at
 * 12px, which the glyph did not.
 */
export function Chevron({
  open = false,
  className = "",
}: {
  open?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-3 shrink-0 transition-transform duration-150 ${
        open ? "rotate-180" : ""
      } ${className}`}
    >
      <path d="M3 4.75 6 7.75 9 4.75" />
    </svg>
  );
}
