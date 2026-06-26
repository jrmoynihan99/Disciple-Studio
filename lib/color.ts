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

/** Hex → "rgba(r, g, b, a)" string for inline styles. */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}
