/**
 * The hostile-URL guard. Ported verbatim from `core.js`.
 *
 * EVERY URL in this dataset is CHURCH-CONTROLLED — scraped hrefs, app-store
 * links, evidence source_urls, logo URLs. React escapes text content but will
 * happily render `href="javascript:..."` as a live click target.
 *
 * Allow only navigable schemes; anything else must render as INERT TEXT rather
 * than a link. `fixture/edge-cases/records.json` carries `zz_hostile_url` with
 * `javascript:` in `own_url`, `church_url`, `q1.source_url` and
 * `brand.logo_url` — all four must come back as text.
 *
 * This is a one-liner that a rewrite drops without noticing, which is exactly
 * why there is a fixture containing an attack.
 */

export const SAFE_SCHEME = /^(?:https?:|mailto:|\/|#)/i;

/** The URL if it is safe to navigate to, or "" — never throws. */
export function safeUrl(u: unknown): string {
  const s = String(u ?? "").trim();
  return SAFE_SCHEME.test(s) ? s : "";
}

/** Display form only — the href stays the full URL. */
export function shortUrl(u: unknown): string {
  const s = String(u ?? "")
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
  return s.length > 48 ? s.slice(0, 47) + "…" : s;
}

/**
 * The same shape check `qa.clean_email()` applies upstream.
 *
 * The roster model once stored a link's TEXT ("Email Bianca Bellido") as an
 * email address, and a dead `mailto:` phrase must be impossible to render from
 * either side of the build.
 */
const MAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/;

/** The normalised address, or "" if it is not one. */
export function safeEmail(e: unknown): string {
  // The local part is case-sensitive in theory and never in practice; scraped
  // addresses arrive title-cased off "Contact Us" pages, and a copied address
  // should read like an address.
  const s = String(e ?? "").trim().toLowerCase();
  return MAIL_RE.test(s) ? s : "";
}
