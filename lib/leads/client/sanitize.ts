import DOMPurify from "dompurify";
import { SANITIZE_CONFIG, decorateAnchor } from "@/lib/leads/engine/sanitize-policy";

/**
 * The one place campaign HTML becomes safe to render.
 *
 * BROWSER ONLY, and deliberately so. DOMPurify needs a real DOM because that is
 * the whole point of it — it parses the markup the way the browser will, rather
 * than guessing at it with patterns. The preview renders client-side, so the
 * sanitising happens exactly where the HTML is about to be inserted, with no
 * window in between where an "already sanitised" string could be trusted by
 * mistake.
 *
 * The policy itself lives in `engine/sanitize-policy.ts` so the test suite can
 * fire attack strings at the same configuration under jsdom.
 */

let hooked = false;

/**
 * Registered once, not per call. `addHook` appends, so calling it on every
 * render would stack thousands of copies of the same function and quietly turn
 * a cheap sanitise into a slow one.
 */
function ensureHook(): void {
  if (hooked) return;
  DOMPurify.addHook("afterSanitizeAttributes", decorateAnchor);
  hooked = true;
}

/**
 * Sanitise one rendered email body for display.
 *
 * Returns a string intended for `dangerouslySetInnerHTML` — that call is only
 * defensible because it is fed from here, and from nowhere else.
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return "";
  ensureHook();
  return DOMPurify.sanitize(html, SANITIZE_CONFIG) as unknown as string;
}
