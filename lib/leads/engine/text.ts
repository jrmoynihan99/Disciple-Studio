/**
 * HTML entity decoding for scraped display text.
 *
 * Addresses and names come off "Contact Us" pages already HTML-encoded, so the
 * record holds the literal string `759 W Int&#39;l Ave`. React renders text
 * nodes verbatim, so without this the console shows the entity to the user —
 * which reads as corrupted data about a real church.
 *
 * SAFE BY CONSTRUCTION, and it has to be: the input is church-controlled. This
 * decodes to a plain JS string that is then rendered as a TEXT NODE, never as
 * markup, so `&lt;script&gt;` becomes the visible characters `<script>` and
 * nothing else. Nothing here may ever reach `dangerouslySetInnerHTML`.
 *
 * Deliberately not a general-purpose decoder. Only the five XML predefined
 * entities and numeric references — the set a scraper actually emits — because
 * a 2,000-name table is a liability nobody will audit.
 */

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(s: unknown): string {
  const str = String(s ?? "");
  if (!str.includes("&")) return str;

  return str.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    const b = body.toLowerCase();

    if (b.startsWith("#")) {
      const code = b.startsWith("#x") ? parseInt(b.slice(2), 16) : parseInt(b.slice(1), 10);
      // Refuse anything that is not a plain character: surrogates, out-of-range
      // code points, and the C0 controls all come back as the original text
      // rather than as something invisible.
      if (!Number.isFinite(code) || code < 0x20 || code > 0x10ffff) return whole;
      if (code >= 0xd800 && code <= 0xdfff) return whole;
      return String.fromCodePoint(code);
    }

    // An unknown name is left exactly as it was found. Guessing would invent
    // text that is not on the church's page.
    return NAMED[b] ?? whole;
  });
}
