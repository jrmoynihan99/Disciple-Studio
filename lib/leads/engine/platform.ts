/**
 * Naming the platform. Ported verbatim from `core.js`.
 *
 * The list line names the PLATFORM, not the Church Center modules. A provider is
 * named ONCE — "Groups, Registrations, Giving" are three features of one product,
 * and saying so three times told the reader nothing they could act on.
 *
 * Mixed-corpus rule: the backend ChMS is named from the RECORDED `platform`
 * fact, not inferred from apps — so a non-Church-Center church names its own
 * platform, never "Church Center".
 */

import type { ChurchRecord, IndexRow, QuestionKey } from "./types.ts";
import { backendName } from "./backend.ts";

/**
 * @param builder      `q7.platform` — the site builder, e.g. "Wix"
 * @param platformKey  the recorded `platform` fact, e.g. "tithely"
 * @param hasApps      whether the church has any Church Center apps switched on
 */
export function platformLine(
  builder: string | undefined | null,
  platformKey: string | undefined | null,
  hasApps: boolean,
): string {
  const out: string[] = [];
  const p = builder;
  if (p && p !== "Church Center default") out.push(p);
  const plat = (platformKey ?? "").toLowerCase();
  // `backendName` covers the 11 values the generated vocabulary has no name for.
  // Before it did, a church running Pushpay or ChurchTrac showed only its
  // website builder and read as though we had detected no backend at all.
  const backend =
    plat === "church_center" || hasApps || p === "Church Center default"
      ? "Church Center"
      : backendName(plat);
  // Dedupe: don't repeat the backend if the builder line already named it.
  if (backend && !out.some((x) => x.toLowerCase() === backend.toLowerCase())) out.push(backend);
  return out.length ? out.join(" · ") : "no platform identified";
}

export function platformLineFromRecord(rec: ChurchRecord): string {
  return platformLine(rec.q7?.platform, rec.platform, (rec.apps ?? []).length > 0);
}

/**
 * The slim index does not carry `apps[]`.
 *
 * That is only reachable for a church whose recorded `platform` is NOT
 * `church_center` but which nonetheless has Church Center apps enabled — in that
 * one case the index would name the builder and omit "Church Center". No church
 * in the 134-record fixture has a non-empty `apps[]`, so it cannot be exercised
 * here and both projections agree on all 134.
 *
 * `ap` is honoured when a publish chooses to carry it, so closing the gap later
 * is a change to the index builder and not to this function.
 */
export function platformLineFromIndex(row: IndexRow): string {
  return platformLine(row.q7?.p, row.pf, row.ap === true);
}

/** q7/q8 each carry TWO facets: what the thing IS, and how it MEASURES. */
export const PLATFORM_FACETS: Partial<Record<QuestionKey, string>> = {
  q7: "q7_platform",
  q8: "q8_platform",
};
