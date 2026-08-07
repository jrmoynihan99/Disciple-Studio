/**
 * Convert a hex color (#rgb or #rrggbb) to an "R G B" triple string suitable
 * for the CSS-var token system, e.g. "#10b981" -> "16 185 129". Used to inject
 * a church's brand accent into `--brand` so `rgb(var(--brand) / alpha)` works.
 * Falls back to emerald-400 on a malformed value.
 */
export function hexToTriple(hex: string): string {
  const fallback = "52 211 153";
  if (!hex) return fallback;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return fallback;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** Parse a hex color to [r, g, b], or null if malformed. */
function parseHex(hex: string): [number, number, number] | null {
  if (!hex) return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const toHex = (n: number) =>
  Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

/**
 * Darken a hex color by mixing toward black. `amount` is 0–1 (0.12 = 12%
 * darker). Returns the input unchanged if it can't be parsed.
 */
export function darken(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb.map((c) => c * (1 - amount));
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Lighten a hex color by mixing toward white. The mirror of `darken`, and the
 * other half of what a hand-picked accent needs: a colour that reads on a white
 * page is routinely invisible on the dark one the same demo can be opened in.
 */
export function lighten(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb.map((c) => c + (255 - c) * amount);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * WCAG relative luminance, 0 (black) to 1 (white).
 *
 * The real formula, gamma expansion and all, rather than the "perceived
 * brightness" average that gets pasted around: the difference decides whether
 * white or black text goes on a saturated blue, and the cheap version gets that
 * wrong in the exact middle of the range where accents live.
 */
export function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors, 1 (identical) to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Black or white text for a filled swatch of this colour.
 *
 * The threshold is the crossover point where the two swap, computed rather than
 * eyeballed: white text wins below it, near-black above. Near-black rather than
 * pure, because a pure-black label on a mid-tone brand colour reads as a
 * rendering fault next to the rest of the page's ink.
 */
export function inkOn(hex: string): string {
  return contrastRatio(hex, "#ffffff") >= contrastRatio(hex, "#141414") ? "#ffffff" : "#141414";
}

/** Hex → "rgba(r, g, b, a)" string for inline styles. */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}
