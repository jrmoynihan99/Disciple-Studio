/**
 * WHAT THE EMAIL PREVIEW IS ALLOWED TO RENDER.
 *
 * The policy lives apart from DOMPurify itself so that two things can share one
 * definition: the browser module that actually sanitises
 * (`lib/leads/client/sanitize.ts`), and the test that fires attack strings at it
 * under jsdom. A policy tested in one place and applied in another is a policy
 * that eventually differs from itself.
 *
 * No imports, so `node --test` can reach it — same constraint as `person-name.ts`.
 *
 * WHY DOMPURIFY AND NOT THE REGEXES THIS REPLACED. Two hand-rolled attempts
 * shipped two real holes within an hour: the first never checked an anchor's
 * href at all, and the second tested the raw attribute for `javascript:` — which
 * a browser never sees, because it decodes `javascript&#58;` before resolving
 * the URL. Both were written carefully. The lesson is not "be more careful", it
 * is that matching patterns against markup loses to anyone who knows how a real
 * parser differs from a regex, and DOMPurify uses a real parser.
 */

/** Formatting an email legitimately uses. Nothing here can execute. */
export const ALLOWED_TAGS = [
  "a", "b", "strong", "i", "em", "u", "s", "br", "p", "div", "span", "pre", "code",
  "ul", "ol", "li", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6", "hr",
  "table", "thead", "tbody", "tr", "td", "th", "img",
];

/**
 * `style` is allowed because Instantly's editor emits inline styles for bold and
 * spacing, and dropping it would make the preview a worse likeness than the
 * plain-text one it replaced. DOMPurify parses and filters CSS rather than
 * pattern-matching it.
 */
export const ALLOWED_ATTR = ["href", "src", "alt", "title", "style"];

/**
 * Schemes a preview may link to. An ALLOW-LIST, checked by DOMPurify after it
 * has decoded the attribute — the step whose absence made the previous version
 * bypassable. A relative URL has no scheme and is matched by the trailing
 * alternation.
 */
export const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

/**
 * A LINK IN THE PREVIEW OPENS A NEW TAB AND SAYS WHERE IT GOES.
 *
 * Without `target`, clicking a demo link navigates the dialog away and the whole
 * review — campaign choice, plan, rendered emails — is gone. `rel` is not
 * optional alongside it: a new tab opened without `noopener` can reach back and
 * navigate the opener.
 *
 * `title` carries the resolved URL so hovering answers "is this the right
 * church" without a URL cluttering the body text — which is the entire reason
 * the rich preview exists rather than the plain one.
 *
 * Applied on DOMPurify's `afterSanitizeAttributes` hook, so it only ever sees
 * attributes that already survived the policy above.
 */
export function decorateAnchor(node: Element): void {
  if (node.tagName !== "A") return;
  node.setAttribute("target", "_blank");
  node.setAttribute("rel", "noopener noreferrer");
  const href = node.getAttribute("href");
  if (href && !node.getAttribute("title")) node.setAttribute("title", href);
}

/**
 * The config object both the browser and the tests hand to DOMPurify.
 *
 * NOT `as const` — DOMPurify's own types take mutable `string[]`, and a readonly
 * tuple fails to assign. The arrays are module-level constants either way.
 */
export const SANITIZE_CONFIG: {
  ALLOWED_TAGS: string[];
  ALLOWED_ATTR: string[];
  ALLOWED_URI_REGEXP: RegExp;
  ADD_ATTR: string[];
} = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOWED_URI_REGEXP,
  // `target` and `rel` are added by the hook after attribute sanitising, so they
  // must be permitted explicitly or DOMPurify strips them straight back off.
  ADD_ATTR: ["target", "rel"],
};
