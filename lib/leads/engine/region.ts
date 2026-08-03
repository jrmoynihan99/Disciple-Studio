/**
 * Country and subdivision. Ported from `core.js`.
 *
 * The two sources spell the same fact differently, and this is the one place
 * that is reconciled:
 *
 *   record   profile.location = "Newton, NC"   -> subdivision is field [1]
 *   index    rg               = "NC, USA"      -> subdivision is field [0]
 *
 * `region.test.mts` asserts the two agree for all 134 fixture churches.
 */

import type { ChurchRecord, IndexRow } from "./types.ts";

/**
 * Normalize a US state to a single USPS two-letter code.
 *
 * Without this, raw "Texas" / "tx" / "TX" produced three duplicate, mixed-case
 * entries in one dropdown.
 */
const US_ABBR = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA",
  "RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
]);

const US_NAME: Record<string, string> = {
  alabama:"AL",alaska:"AK",arizona:"AZ",arkansas:"AR",california:"CA",colorado:"CO",
  connecticut:"CT",delaware:"DE",florida:"FL",georgia:"GA",hawaii:"HI",idaho:"ID",illinois:"IL",
  indiana:"IN",iowa:"IA",kansas:"KS",kentucky:"KY",louisiana:"LA",maine:"ME",maryland:"MD",
  massachusetts:"MA",michigan:"MI",minnesota:"MN",mississippi:"MS",missouri:"MO",montana:"MT",
  nebraska:"NE",nevada:"NV","new hampshire":"NH","new jersey":"NJ","new mexico":"NM",
  "new york":"NY","north carolina":"NC","north dakota":"ND",ohio:"OH",oklahoma:"OK",oregon:"OR",
  pennsylvania:"PA","rhode island":"RI","south carolina":"SC","south dakota":"SD",tennessee:"TN",
  texas:"TX",utah:"UT",vermont:"VT",virginia:"VA",washington:"WA","west virginia":"WV",
  wisconsin:"WI",wyoming:"WY","district of columbia":"DC","washington dc":"DC",
  "washington, d.c.":"DC",
};

export function normState(s: string | undefined | null): string {
  const v = (s ?? "").trim();
  if (!v) return "";
  const up = v.toUpperCase();
  if (US_ABBR.has(up)) return up;
  return US_NAME[v.toLowerCase().replace(/\./g, "").trim()] ?? "";
}

/**
 * The subdivision a country actually uses.
 *
 * `normState` only knows US states, so a Canadian church filtered as stateless.
 * This keeps any short code the scrape recorded (BC, ON, NSW, ENG) and drops
 * anything spelled out — a half-spelled region is not a facet value.
 */
function toSubdiv(raw: string | undefined | null): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  return normState(v) || (v.length <= 3 ? v.toUpperCase() : "");
}

/** record: `profile.location` is "City, SUBDIV" — the subdivision is field [1]. */
export function subdivFromRecord(rec: ChurchRecord): string {
  const loc = String((rec.profile?.location as string) ?? "");
  return toSubdiv(loc.split(",")[1]);
}

/**
 * index: `rg` is "SUBDIV, COUNTRY" — the subdivision is field [0].
 *
 * ONLY when there are two parts. A one-part `rg` is not a subdivision: in the
 * fixture those five values are "USA", "Ferndale", "Mannamead" and "Brisbane" —
 * a country and three bare localities. Reading field [0] unconditionally put
 * "USA" into the state dropdown as though it were a state.
 *
 * KNOWN, BOUNDED DATA LOSS. Where the scrape spelled a state out in full
 * ("Ocean Springs, Mississippi"), the index builder dropped it and wrote
 * `rg: "USA"`, so the index cannot recover what the record still holds
 * (`MS`). That is 2 of 134 churches here; they filter as having no subdivision
 * and appear only under "any". `region.test.mts` pins the exact set so a
 * regression that grows it fails loudly rather than quietly shrinking a filter.
 *
 * The real fix belongs upstream — normalise the state before writing `rg` — and
 * the moment it lands, this function needs no change.
 */
export function subdivFromIndex(row: IndexRow): string {
  const parts = (row.rg ?? "").split(",");
  if (parts.length < 2) return "";
  return toSubdiv(parts[0]);
}

export function countryFromRecord(rec: ChurchRecord): string {
  return rec.country ?? "";
}

export function countryFromIndex(row: IndexRow): string {
  return row.co ?? "";
}
