import { list, put, del, get } from "@vercel/blob";
import { slugify } from "@/lib/generateDemo";

/**
 * NOT the Lead Console's export groups. See `lib/leads/server/groups.ts`.
 *
 * These are demo-generation groups, keyed by demo `slug`, at the `groups/`
 * prefix, shared. Those are lead export groups, keyed by `org_id`, at
 * `leads/groups/<userId>/`, single-writer. The two meet when the export button
 * is wired to demo generation; until then, do not read one as the other.
 *
 * Import groups — one blob per bulk import, stored as `groups/<id>.json` in the
 * same private Vercel Blob store as the church demos. A group bundles the demos
 * produced by one import plus the data for its downloadable output spreadsheet.
 *
 * Mirrors the storage approach in `churches/index.ts` (private access, no-store
 * reads, no random suffix) so a just-saved group is listed immediately.
 */

const ACCESS = "private" as const;
const PREFIX = "groups/";
const pathnameFor = (id: string) => `${PREFIX}${id}.json`;

/** One entry in a group's export — one generated demo, with the church's full
 *  contacts object (people, church emails, phone, …) carried through verbatim. */
export interface GroupRow {
  churchName: string;
  slug: string;
  /** In-app path to the demo, e.g. "/c/grace-community-church". */
  demoPath: string;
  /** The church's `contacts` object from the source data (shape not enforced). */
  contacts?: unknown;
}

export interface Group {
  id: string;
  name: string;
  /** The static generic demo link included in every output row. */
  genericLink: string;
  /** ISO timestamp, stamped by the API route (not here — keeps this pure-ish). */
  createdAt: string;
  rows: GroupRow[];
}

/** Summary shape for the studio index list. */
export interface GroupSummary {
  id: string;
  name: string;
  count: number;
  createdAt: string;
}

/** A URL-safe group id from a name plus a short disambiguating suffix. */
export function makeGroupId(name: string, suffix: string): string {
  const base = slugify(name) || "group";
  return `${base}-${suffix}`;
}

async function readGroup(pathname: string): Promise<Group | null> {
  try {
    const result = await get(pathname, { access: ACCESS });
    if (!result?.stream) return null;
    return (await new Response(result.stream).json()) as Group;
  } catch {
    return null;
  }
}

/** Create or overwrite a group's blob. */
export async function saveGroup(group: Group): Promise<void> {
  await put(pathnameFor(group.id), JSON.stringify(group, null, 2) + "\n", {
    access: ACCESS,
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

/** Look up one group by id, or null if it doesn't exist. */
export async function getGroup(id: string): Promise<Group | null> {
  return readGroup(pathnameFor(id));
}

/** All groups, newest first, as summaries for the index. */
export async function getAllGroups(): Promise<GroupSummary[]> {
  let blobs;
  try {
    ({ blobs } = await list({ prefix: PREFIX, limit: 1000 }));
  } catch {
    return [];
  }
  const groups = await Promise.all(
    blobs.filter((b) => b.pathname.endsWith(".json")).map((b) => readGroup(b.pathname)),
  );
  return groups
    .filter((g): g is Group => g !== null)
    .map((g) => ({ id: g.id, name: g.name, count: g.rows.length, createdAt: g.createdAt }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Remove a group's blob. No-op if it's already gone. */
export async function deleteGroup(id: string): Promise<void> {
  try {
    const { blobs } = await list({ prefix: pathnameFor(id), limit: 1 });
    const exact = blobs.find((b) => b.pathname === pathnameFor(id));
    if (exact) await del(exact.url);
  } catch {
    /* already gone — treat as success */
  }
}
