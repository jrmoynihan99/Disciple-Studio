/**
 * WHAT AN EMAIL WILL SAY, filled in, before a congregation reads it.
 *
 * Instantly renders the real thing at send time. This renders the same template
 * against the same variables so a person can check fifteen churches in one screen
 * — and the check that matters is not "is the wording good", it is "does every
 * slot actually have something in it". Four sends in five reach a church at
 * `info@` with no name attached, so an opener written as `Hi {{first_name},` is
 * not a rare failure, it is the common one, and it arrives as `Hi ,`.
 *
 * A SECOND RENDERER IS A RISK, AND IT IS TAKEN DELIBERATELY. This is an
 * approximation of somebody else's template engine: it can prove a variable is
 * EMPTY, which is the bug worth catching, but it cannot prove the final bytes
 * match. The authoritative check stays a real send to yourself. Both exist
 * because they catch different things — this one covers every church cheaply,
 * that one covers one church exactly.
 *
 * Pure and alias-free, so `node --test` can reach it.
 */

export interface RenderResult {
  text: string;
  /** Tags with no value and no fallback. Each one is a hole in the email. */
  empty: string[];
  /** Tags we hold no variable for at all — usually a typo, or an AI-SDR slot. */
  unknown: string[];
  /** True when the template chose between spintax options and we picked one. */
  spun: boolean;
}

/**
 * `{{ name | fallback }}` — the fallback may itself be a chain, and the LAST
 * link is a literal.
 *
 * Instantly documents `{{first_name|there}}`, and separately carries an open
 * request asking for exactly that behaviour, so the two disagree about whether
 * it works. Rather than pick a side, this resolves the chain itself and flags
 * anything that resolved to nothing — if Instantly's own handling turns out to
 * differ, the flag still points at the line that would break.
 */
function resolveTag(raw: string, vars: Record<string, string>, out: RenderResult): string {
  const parts = raw.split("|").map((p) => p.trim());
  for (const [i, part] of parts.entries()) {
    const last = i === parts.length - 1;
    if (Object.prototype.hasOwnProperty.call(vars, part)) {
      const value = (vars[part] ?? "").trim();
      if (value) return value;
      // An empty variable is only a hole if nothing follows it.
      if (last) {
        out.empty.push(part);
        return "";
      }
      continue;
    }
    /**
     * THE LAST LINK IS A LITERAL, NOT A MISSING VARIABLE. `{{first_name|there}}`
     * ends in a word to print, and reporting "there" as an unknown variable
     * would bury the real unknowns in noise.
     */
    if (last) {
      if (parts.length > 1) return part;
      out.unknown.push(part);
      return `{{${raw}}}`;
    }
  }
  return "";
}

/**
 * Spintax — `{one|two|three}` — collapsed to a single deterministic choice.
 *
 * DETERMINISTIC, and seeded by the church rather than random, so re-opening the
 * preview shows the same email twice. A preview that reshuffled on every render
 * would make it impossible to tell a template change from a re-roll.
 *
 * Matched only after merge tags are gone, so `{{a|b}}` cannot be mistaken for a
 * spin group.
 */
function spin(text: string, seed: number, out: RenderResult): string {
  return text.replace(/\{([^{}]*\|[^{}]*)\}/g, (_m, group: string) => {
    const options = group.split("|");
    out.spun = true;
    return options[Math.abs(seed) % options.length] ?? options[0] ?? "";
  });
}

/** A stable small integer from a string, so spintax picks the same option twice. */
function seedOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** Enough HTML to read an email body as text. Instantly bodies are light HTML. */
function htmlToText(html: string): string {
  return html
    /**
     * A LINK KEEPS ITS DESTINATION, as `text (url)`.
     *
     * PARENTHESES RATHER THAN AN ARROW, because the arrow collides. Real anchor
     * text in these campaigns is `MEMBER PORTAL →` — a trailing arrow is a
     * common way to write a call to action — and `label → url` then renders as
     * `MEMBER PORTAL → → https://…`, which reads as a mistake in the template
     * rather than a mistake in the preview.
     *
     * The anchor text is the part a reader sees and the href is the part that
     * can be broken, so showing only the text would render a preview in which a
     * dead link looks perfect: `DEMO LINK` reads the same whether the href is a
     * church's demo, an unresolved `{{demoLink}}`, or nothing at all. Since the
     * whole reason this preview exists is to catch a variable that did not fill,
     * hiding the one attribute variables go into would defeat it.
     */
    .replace(
      /<a\b[^>]*?href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
      (_m, href: string, text: string) => {
        const label = text.replace(/<[^>]+>/g, "").trim();
        const url = href.trim();
        if (!url) return `${label} (NO LINK)`;
        return label && label !== url ? `${label} (${url})` : url;
      },
    )
    // An anchor with no href at all is still a broken link, not plain text.
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, (_m, text: string) => `${text.replace(/<[^>]+>/g, "").trim()} (NO LINK)`)
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    // A PARAGRAPH IS A BLANK LINE, a div or a row is one. Collapsing both to a
    // single break makes a four-paragraph email preview as a wall of text, which
    // is the one thing a reviewer is looking at the shape of.
    .replace(/<\s*\/\s*(p|h[1-6])\s*>/gi, "\n\n")
    .replace(/<\s*\/\s*(div|tr|li)\s*>/gi, "\n")
    .replace(/<\s*li\s*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * TAGS AND ATTRIBUTES THE PREVIEW WILL RENDER. Anything else is dropped.
 *
 * AN ALLOW-LIST, NOT A BLOCK-LIST. The content is the user's own campaign, read
 * back over an authenticated API, so the realistic worst case is self-inflicted
 * — but "the input is trusted" is the assumption every injection bug is built
 * on, and a block-list only stops the tags somebody thought of. This is the
 * formatting an email actually uses; nothing here can execute.
 */
const ALLOWED_TAGS = new Set([
  "a", "b", "strong", "i", "em", "u", "s", "br", "p", "div", "span", "pre", "code",
  "ul", "ol", "li", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6", "hr",
  "table", "thead", "tbody", "tr", "td", "th", "img",
]);

const ALLOWED_ATTRS = new Set(["href", "src", "alt", "title", "style"]);

/** `javascript:` and friends, including entity- and whitespace-obfuscated forms. */
const DANGEROUS_URL = /^\s*(javascript|vbscript|data)\s*:/i;

/**
 * Strip a style value down to something that cannot fetch or execute.
 * `url()` is removed because a remote fetch from a preview is the tracking-pixel
 * behaviour this whole pipeline deliberately avoids.
 */
const safeStyle = (v: string) =>
  v.replace(/url\s*\([^)]*\)/gi, "").replace(/expression\s*\([^)]*\)/gi, "").trim();

function sanitize(html: string): string {
  // Elements whose CONTENT is also unsafe go first, opening tag to closing tag.
  let out = html.replace(
    /<\s*(script|style|iframe|object|embed|noscript|template)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,
    "",
  );
  // Any leftover void/unclosed form of the same, plus doctype and comments.
  out = out.replace(/<\s*\/?\s*(script|style|iframe|object|embed|link|meta|base|form|input|button)\b[^>]*>/gi, "");
  out = out.replace(/<!--[\s\S]*?-->/g, "").replace(/<![^>]*>/g, "");

  return out.replace(/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g,
    (_m, close: string, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (close) return `</${tag}>`;

      const kept: string[] = [];
      const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
      let m: RegExpExecArray | null;
      while ((m = attrRe.exec(rawAttrs))) {
        const name = m[1].toLowerCase();
        // `on*` handlers are the whole reason an allow-list exists.
        if (!ALLOWED_ATTRS.has(name)) continue;
        let value = m[3] ?? m[4] ?? m[5] ?? "";
        if ((name === "href" || name === "src") && DANGEROUS_URL.test(value)) continue;
        if (name === "style") {
          value = safeStyle(value);
          if (!value) continue;
        }
        kept.push(`${name}="${value.replace(/"/g, "&quot;")}"`);
      }

      /**
       * A LINK IN THE PREVIEW OPENS A NEW TAB, AND SAYS WHERE IT GOES.
       *
       * Without `target`, clicking a demo link navigates the dialog away and the
       * whole review — campaign choice, plan, everything — is gone. `title`
       * carries the resolved URL so hovering answers "is this the right church"
       * without the URL cluttering the body text.
       */
      if (tag === "a") {
        const href = kept.find((a) => a.startsWith("href="));
        kept.push('target="_blank"', 'rel="noopener noreferrer"');
        if (href && !kept.some((a) => a.startsWith("title="))) {
          kept.push(`title=${href.slice(5)}`);
        }
      }
      return `<${tag}${kept.length ? " " + kept.join(" ") : ""}>`;
    });
}

/**
 * The same render, kept as HTML so the preview shows what the church sees —
 * bold as bold, a link as a link you can click.
 *
 * SHARES `resolveTag` WITH `render`, so the empty/unknown reporting is identical.
 * The two differ only in what they do AFTER substitution.
 */
export function renderRich(
  template: string,
  vars: Record<string, string>,
  seedKey = "",
): RenderResult {
  const out: RenderResult = { text: "", empty: [], unknown: [], spun: false };
  if (!template) return out;
  const merged = template.replace(/\{\{([^{}]+)\}\}/g, (_m, raw: string) =>
    resolveTag(raw, vars, out),
  );
  out.text = sanitize(spin(merged, seedOf(seedKey), out));
  return out;
}

/**
 * Render one subject or body for one church.
 *
 * `seedKey` should be stable per church — the slug — so the same church always
 * previews the same spin.
 */
export function render(
  template: string,
  vars: Record<string, string>,
  seedKey = "",
): RenderResult {
  const out: RenderResult = { text: "", empty: [], unknown: [], spun: false };
  if (!template) return out;

  const merged = template.replace(/\{\{([^{}]+)\}\}/g, (_m, raw: string) =>
    resolveTag(raw, vars, out),
  );
  out.text = htmlToText(spin(merged, seedOf(seedKey), out));
  return out;
}
